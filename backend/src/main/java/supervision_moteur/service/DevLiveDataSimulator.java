package supervision_moteur.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import supervision_moteur.dto.BatchIngestionRequest;
import supervision_moteur.dto.LiveMeasurementRequest;
import supervision_moteur.enums.StatutMachine;
import supervision_moteur.repository.MesureRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Replays measurements from the replay_mesures table as live data.
 * Reads from replay_mesures (a frozen copy), inserts into the live mesures table.
 * Cycles through all records and loops back to the beginning.
 *
 * Enable with: APP_LIVE_SIMULATION_ENABLED=true
 * Control speed with: APP_LIVE_SIMULATION_INTERVAL_MS (default 5000ms)
 */
@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "app.live-simulation.enabled", havingValue = "true", matchIfMissing = false)
public class DevLiveDataSimulator {

    private final JdbcTemplate jdbcTemplate;
    private final LiveIngestionService liveIngestionService;
    private final MesureRepository mesureRepository;
    private final AtomicLong currentIndex = new AtomicLong(0);
    private List<Long> replayIds;

    @Scheduled(
            initialDelayString = "${app.live-simulation.initial-delay-ms:10000}",
            fixedDelayString = "${app.live-simulation.interval-ms:5000}"
    )
    public void replayNextSample() {
        // Lazy-load replay IDs from the frozen source table
        if (replayIds == null || replayIds.isEmpty()) {
            try {
                replayIds = jdbcTemplate.queryForList(
                        "SELECT id FROM replay_mesures ORDER BY id", Long.class);
            } catch (Exception e) {
                log.warn("replay_mesures table not found — replay disabled: {}", e.getMessage());
                return;
            }
            if (replayIds.isEmpty()) {
                log.warn("No records in replay_mesures — replay skipped");
                return;
            }
            log.info("Live replay initialized with {} source measurements", replayIds.size());
        }

        // Pick the next record, loop at the end
        long index = currentIndex.getAndIncrement() % replayIds.size();

        // On loop restart, clear the live tables to start fresh
        if (index == 0 && currentIndex.get() > 1) {
            log.info("Replay loop complete — restarting from measurement 1");
            jdbcTemplate.execute("TRUNCATE TABLE alertes RESTART IDENTITY CASCADE");
            jdbcTemplate.execute("TRUNCATE TABLE predictions RESTART IDENTITY CASCADE");
            jdbcTemplate.execute("TRUNCATE TABLE anomalies RESTART IDENTITY CASCADE");
            jdbcTemplate.execute("TRUNCATE TABLE mesures RESTART IDENTITY CASCADE");
        }

        Long replayId = replayIds.get((int) index);

        // Read from the frozen replay table via JDBC
        Map<String, Object> row;
        try {
            row = jdbcTemplate.queryForMap("SELECT * FROM replay_mesures WHERE id = ?", replayId);
        } catch (Exception e) {
            return;
        }

        LiveMeasurementRequest replay = new LiveMeasurementRequest();
        replay.setMachineId(((Number) row.get("machine_id")).longValue());
        replay.setHorodatage(LocalDateTime.now());
        replay.setTemperature((Double) row.get("temperature"));
        replay.setCourant((Double) row.get("courant"));
        replay.setVibration((Double) row.get("vibration"));
        replay.setRpm((Double) row.get("rpm"));

        String statut = (String) row.get("statut");
        try {
            replay.setStatut(StatutMachine.valueOf(statut));
        } catch (Exception e) {
            replay.setStatut(StatutMachine.NORMAL);
        }

        Object anomLabel = row.get("etiquette_anomalie");
        replay.setEtiquetteAnomalie(anomLabel instanceof Boolean ? (Boolean) anomLabel : false);

        liveIngestionService.ingest(new BatchIngestionRequest(List.of(replay), false));

        if (index % 500 == 0) {
            long totalLive = mesureRepository.count();
            log.info("Live replay: {}/{} — total live mesures: {}", index + 1, replayIds.size(), totalLive);
        }
    }
}
