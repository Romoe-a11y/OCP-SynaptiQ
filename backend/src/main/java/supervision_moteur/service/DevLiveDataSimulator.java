package supervision_moteur.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import supervision_moteur.dto.BatchIngestionRequest;
import supervision_moteur.dto.LiveMeasurementRequest;
import supervision_moteur.entity.Mesure;
import supervision_moteur.repository.MesureRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Replays existing measurements from the database as live data.
 * Cycles through all mesures ordered by ID, injecting each with a current timestamp.
 * When it reaches the end, it loops back to the beginning.
 *
 * Enable with: app.live-simulation.enabled=true
 * Control speed with: app.live-simulation.interval-ms (default 5000 = 5 seconds)
 */
@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "app.live-simulation.enabled", havingValue = "true", matchIfMissing = false)
public class DevLiveDataSimulator {

    private final MesureRepository mesureRepository;
    private final LiveIngestionService liveIngestionService;
    private final AtomicLong currentIndex = new AtomicLong(0);
    private List<Long> mesureIds;

    @Scheduled(
            initialDelayString = "${app.live-simulation.initial-delay-ms:10000}",
            fixedDelayString = "${app.live-simulation.interval-ms:5000}"
    )
    public void replayNextSample() {
        // Lazy-load the list of mesure IDs on first call
        if (mesureIds == null || mesureIds.isEmpty()) {
            mesureIds = mesureRepository.findAllIdsSorted();
            if (mesureIds.isEmpty()) {
                log.warn("No mesures found in database — replay skipped");
                return;
            }
            log.info("Live replay initialized with {} measurements", mesureIds.size());
        }

        // Pick the next mesure, loop back at the end
        long index = currentIndex.getAndIncrement() % mesureIds.size();
        Long mesureId = mesureIds.get((int) index);

        Mesure original = mesureRepository.findById(mesureId).orElse(null);
        if (original == null) return;

        // Copy the real sensor values but use current timestamp
        LiveMeasurementRequest replay = new LiveMeasurementRequest();
        replay.setMachineId(original.getMachine().getId());
        replay.setHorodatage(LocalDateTime.now());
        replay.setTemperature(original.getTemperature());
        replay.setCourant(original.getCourant());
        replay.setVibration(original.getVibration());
        replay.setRpm(original.getRpm());
        replay.setStatut(original.getStatut());
        replay.setEtiquetteAnomalie(original.getEtiquetteAnomalie());

        liveIngestionService.ingest(new BatchIngestionRequest(List.of(replay), false));

        if (index % 1000 == 0) {
            log.info("Live replay: measurement {}/{} (loop {})",
                    index + 1, mesureIds.size(), currentIndex.get() / mesureIds.size());
        }
    }
}
