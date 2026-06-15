package supervision_moteur.service;

import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Caching;
import org.springframework.stereotype.Service;
import supervision_moteur.dto.AiPredictionResponse;
import supervision_moteur.dto.BatchIngestionRequest;
import supervision_moteur.dto.LiveMeasurementRequest;
import supervision_moteur.entity.Machine;
import supervision_moteur.entity.Mesure;
import supervision_moteur.entity.Prediction;
import supervision_moteur.enums.StatutMachine;
import supervision_moteur.repository.MachineRepository;
import supervision_moteur.repository.MesureRepository;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class LiveIngestionService {

    private final MachineRepository machineRepository;
    private final MesureRepository mesureRepository;
    private final AiPredictionService aiPredictionService;
    private final PredictionAuditService predictionAuditService;
    private final AlertService alertService;

    @Caching(evict = {
            @CacheEvict(value = "dashboard", allEntries = true),
            @CacheEvict(value = "dashboardStats", allEntries = true),
            @CacheEvict(value = "operationalDashboard", allEntries = true),
    })
    public Map<String, Object> ingest(BatchIngestionRequest request) {
        List<LiveMeasurementRequest> measurements = request.getMeasurements() != null
                ? request.getMeasurements()
                : List.of();
        boolean runPrediction = request.getRunPrediction() == null || request.getRunPrediction();

        List<Mesure> savedMeasurements = new ArrayList<>();
        List<Prediction> savedPredictions = new ArrayList<>();
        int alertsCreated = 0;

        for (LiveMeasurementRequest item : measurements) {
            Mesure mesure = saveMeasurement(item);
            savedMeasurements.add(mesure);

            if (runPrediction) {
                AiPredictionResponse aiResponse = aiPredictionService.predict(aiPredictionService.requestFromMesure(mesure));
                Prediction prediction = predictionAuditService.persist(mesure, aiResponse);
                savedPredictions.add(prediction);
                if (alertService.createFromPrediction(prediction) != null) {
                    alertsCreated++;
                }
                // Update machine status based on AI prediction
                updateMachineStatus(mesure.getMachine(), prediction);
            }
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("measurementsStored", savedMeasurements.size());
        result.put("predictionsStored", savedPredictions.size());
        result.put("alertsCreated", alertsCreated);
        result.put("mode", "REST_BATCH_UPLOAD");
        return result;
    }

    private void updateMachineStatus(Machine machine, Prediction prediction) {
        if (machine == null || prediction.getStatutPredit() == null) return;
        machine.setStatut(prediction.getStatutPredit());
        machineRepository.save(machine);
    }

    private Mesure saveMeasurement(LiveMeasurementRequest item) {
        Machine machine = machineRepository.findById(item.getMachineId())
                .orElseThrow(() -> new IllegalArgumentException("Machine not found: " + item.getMachineId()));

        Mesure mesure = new Mesure();
        mesure.setMachine(machine);
        mesure.setHorodatage(item.getHorodatage() != null ? item.getHorodatage() : LocalDateTime.now());
        mesure.setTemperature(item.getTemperature());
        mesure.setCourant(item.getCourant());
        mesure.setVibration(item.getVibration());
        mesure.setRpm(item.getRpm());
        mesure.setStatut(item.getStatut() != null ? item.getStatut() : StatutMachine.NORMAL);
        mesure.setEtiquetteAnomalie(item.getEtiquetteAnomalie() != null ? item.getEtiquetteAnomalie() : false);
        return mesureRepository.save(mesure);
    }
}
