package supervision_moteur.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Profile;
import org.springframework.data.domain.Sort;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import supervision_moteur.dto.BatchIngestionRequest;
import supervision_moteur.dto.LiveMeasurementRequest;
import supervision_moteur.entity.Machine;
import supervision_moteur.enums.StatutMachine;
import supervision_moteur.repository.MachineRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.atomic.AtomicLong;

@Slf4j
@Component
@Profile("dev")
@RequiredArgsConstructor
@ConditionalOnProperty(name = "app.live-simulation.enabled", havingValue = "true", matchIfMissing = true)
public class DevLiveDataSimulator {

    private final MachineRepository machineRepository;
    private final LiveIngestionService liveIngestionService;
    private final AtomicLong sequence = new AtomicLong();

    @Scheduled(
            initialDelayString = "${app.live-simulation.initial-delay-ms:8000}",
            fixedDelayString = "${app.live-simulation.interval-ms:5000}"
    )
    public void ingestNextSample() {
        List<Machine> machines = machineRepository.findAll(Sort.by("id"));
        if (machines.isEmpty()) {
            return;
        }

        long step = sequence.incrementAndGet();
        Machine machine = machines.get((int) ((step - 1) % machines.size()));
        LiveMeasurementRequest sample = buildSample(machine, step);

        liveIngestionService.ingest(new BatchIngestionRequest(List.of(sample), true));
        log.debug("Inserted simulated live sample {} for machine {}", step, machine.getId());
    }

    private LiveMeasurementRequest buildSample(Machine machine, long step) {
        double phase = (step * 0.62) + ((machine.getId() % 7) * 0.35);
        boolean criticalWindow = step % 15 == 0;
        boolean warningWindow = !criticalWindow && step % 4 == 0;

        double temperature = 68.0 + (machine.getId() % 5) * 1.1 + Math.sin(phase) * 2.4;
        double current = 21.0 + (machine.getId() % 4) * 1.7 + Math.cos(phase * 0.8) * 1.8;
        double vibration = 0.42 + (machine.getId() % 3) * 0.08 + Math.abs(Math.sin(phase * 1.3)) * 0.16;
        double rpm = 1490.0 + Math.cos(phase * 0.5) * 18.0;
        StatutMachine status = StatutMachine.NORMAL;

        if (warningWindow) {
            temperature = 80.0 + Math.sin(phase) * 3.0;
            current = 31.0 + Math.cos(phase) * 2.0;
            vibration = 1.05 + Math.abs(Math.sin(phase)) * 0.18;
            rpm = 1458.0 + Math.cos(phase) * 12.0;
            status = StatutMachine.ALERTE;
        }

        if (criticalWindow) {
            temperature = 90.0 + Math.sin(phase) * 2.0;
            current = 39.0 + Math.cos(phase) * 2.5;
            vibration = 1.55 + Math.abs(Math.sin(phase)) * 0.25;
            rpm = 1425.0 + Math.cos(phase) * 10.0;
            status = StatutMachine.CRITIQUE;
        }

        LiveMeasurementRequest request = new LiveMeasurementRequest();
        request.setMachineId(machine.getId());
        request.setHorodatage(LocalDateTime.now());
        request.setTemperature(round(temperature));
        request.setCourant(round(current));
        request.setVibration(round(vibration));
        request.setRpm(round(rpm));
        request.setStatut(status);
        request.setEtiquetteAnomalie(status != StatutMachine.NORMAL);
        return request;
    }

    private double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}
