package supervision_moteur.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import supervision_moteur.dto.OperationalDashboardResponse;
import supervision_moteur.entity.*;
import supervision_moteur.repository.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class OperationalDashboardService {

    private final PredictionRepository predictionRepository;
    private final MesureRepository mesureRepository;
    private final AlerteRepository alerteRepository;
    private final DriftCheckRepository driftCheckRepository;
    private final RulPredictionRepository rulPredictionRepository;
    private final MachineRepository machineRepository;
    private final ModelRegistryService modelRegistryService;

    public OperationalDashboardResponse getOperationalData(Long machineId) {
        List<Prediction> predictions = machineId != null
                ? predictionRepository.findTop20ByMachineIdOrderByDateCreationDesc(machineId)
                : predictionRepository.findTop50ByOrderByDateCreationDesc();
        List<Mesure> measures = machineId != null
                ? mesureRepository.findTop100ByMachineIdOrderByHorodatageDesc(machineId)
                : mesureRepository.findTop100ByOrderByHorodatageDesc();
        List<RulPrediction> rul = machineId != null
                ? rulPredictionRepository.findTop20ByMachineIdOrderByPredictedAtDesc(machineId)
                : rulPredictionRepository.findTop20ByOrderByPredictedAtDesc();
        List<DriftCheck> drift = machineId != null
                ? driftCheckRepository.findTop30ByMachineIdOrderByCheckedAtDesc(machineId)
                : driftCheckRepository.findTop30ByOrderByCheckedAtDesc();

        return new OperationalDashboardResponse(
                predictions.stream().map(this::riskPoint).toList(),
                machineRepository.findAll().stream().map(this::machineStatus).toList(),
                predictions.stream().map(this::anomalyPoint).toList(),
                measures.stream().map(this::featurePoint).toList(),
                alerteRepository.findTop50ByOrderByDateCreationDesc().stream().map(this::alertPoint).toList(),
                modelHealth(),
                driftHealth(drift),
                rul.stream().map(this::rulPoint).toList(),
                predictions.stream().filter(p -> p.getExplanation() != null).limit(10).map(this::explanationPoint).toList()
        );
    }

    private Map<String, Object> riskPoint(Prediction prediction) {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("id", prediction.getId());
        item.put("timestamp", prediction.getDateCreation());
        item.put("machineId", prediction.getMachine() != null ? prediction.getMachine().getId() : null);
        item.put("machine", prediction.getMachine() != null ? prediction.getMachine().getNom() : null);
        item.put("label", prediction.getOutputLabel() != null ? prediction.getOutputLabel() : prediction.getStatutPredit());
        item.put("risk", prediction.getNiveauRisque());
        item.put("confidence", prediction.getConfiance());
        item.put("probability", prediction.getProbability());
        return item;
    }

    private Map<String, Object> anomalyPoint(Prediction prediction) {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("timestamp", prediction.getDateCreation());
        item.put("machine", prediction.getMachine() != null ? prediction.getMachine().getNom() : null);
        item.put("anomalyScore", prediction.getAnomalyScore() != null ? prediction.getAnomalyScore() : 0.0);
        return item;
    }

    private Map<String, Object> featurePoint(Mesure mesure) {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("timestamp", mesure.getHorodatage());
        item.put("machineId", mesure.getMachine() != null ? mesure.getMachine().getId() : null);
        item.put("machine", mesure.getMachine() != null ? mesure.getMachine().getNom() : null);
        item.put("temperature", mesure.getTemperature());
        item.put("courant", mesure.getCourant());
        item.put("vibration", mesure.getVibration());
        item.put("rpm", mesure.getRpm());
        return item;
    }

    private Map<String, Object> alertPoint(Alerte alerte) {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("id", alerte.getId());
        item.put("machine", alerte.getMachine() != null ? alerte.getMachine().getNom() : null);
        item.put("message", alerte.getMessage());
        item.put("severity", alerte.getGravite());
        item.put("status", alerte.getStatut());
        item.put("createdAt", alerte.getDateCreation());
        item.put("assignedTechnician", alerte.getAssignedTechnician());
        return item;
    }

    private Map<String, Object> machineStatus(Machine machine) {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("id", machine.getId());
        item.put("name", machine.getNom());
        item.put("status", machine.getStatut());
        item.put("location", machine.getEmplacement());
        item.put("type", machine.getType());
        return item;
    }

    private Map<String, Object> modelHealth() {
        ModelRegistryEntry current = modelRegistryService.currentProduction("diagnostic_model");
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("modelName", current.getModelName());
        item.put("version", current.getVersion());
        item.put("status", current.getStatus());
        item.put("trainingDate", current.getTrainingDate());
        item.put("artifactPath", current.getArtifactPath());
        item.put("metricsJson", current.getMetricsJson());
        return item;
    }

    private Map<String, Object> driftHealth(List<DriftCheck> drift) {
        DriftCheck latest = drift.isEmpty() ? null : drift.get(0);
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("status", latest != null ? latest.getStatus() : "NO_DATA");
        item.put("checkedAt", latest != null ? latest.getCheckedAt() : null);
        item.put("score", latest != null ? latest.getPsiScore() : null);
        item.put("history", drift.stream().map(check -> {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("timestamp", check.getCheckedAt());
            row.put("status", check.getStatus());
            row.put("score", check.getPsiScore());
            row.put("scope", check.getScope());
            row.put("machine", check.getMachine() != null ? check.getMachine().getNom() : "global");
            return row;
        }).toList());
        return item;
    }

    private Map<String, Object> rulPoint(RulPrediction prediction) {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("timestamp", prediction.getPredictedAt());
        item.put("machine", prediction.getMachine() != null ? prediction.getMachine().getNom() : null);
        item.put("rulHours", prediction.getRulHours());
        item.put("rulDays", prediction.getRulDays());
        item.put("confidence", prediction.getConfidence());
        item.put("simulated", prediction.getSimulated());
        item.put("method", prediction.getMethod());
        return item;
    }

    private Map<String, Object> explanationPoint(Prediction prediction) {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("id", prediction.getId());
        item.put("timestamp", prediction.getDateCreation());
        item.put("machine", prediction.getMachine() != null ? prediction.getMachine().getNom() : null);
        item.put("label", prediction.getOutputLabel());
        item.put("decision", prediction.getFinalDecision());
        item.put("explanation", prediction.getExplanation());
        item.put("rawOutputJson", prediction.getRawOutputJson());
        return item;
    }
}
