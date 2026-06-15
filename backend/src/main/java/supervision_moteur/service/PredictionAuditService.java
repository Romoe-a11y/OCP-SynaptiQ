package supervision_moteur.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import supervision_moteur.dto.AiPredictionResponse;
import supervision_moteur.entity.DecisionThresholdConfig;
import supervision_moteur.entity.Machine;
import supervision_moteur.entity.Mesure;
import supervision_moteur.entity.Prediction;
import supervision_moteur.enums.GraviteType;
import supervision_moteur.enums.StatutMachine;
import supervision_moteur.repository.PredictionRepository;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class PredictionAuditService {

    private final PredictionRepository predictionRepository;
    private final DecisionThresholdService thresholdService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public Prediction persist(Mesure mesure, AiPredictionResponse response) {
        Prediction prediction = new Prediction();
        prediction.setMesure(mesure);
        prediction.setMachine(resolveMachine(mesure));
        prediction.setDateCreation(LocalDateTime.now());
        prediction.setOutputLabel(firstNonBlank(response.getDiagnostic_label(), response.getClassifier_label(), "UNKNOWN"));
        prediction.setProbability(firstNonNull(response.getProbability(), response.getConfidence()));
        prediction.setAnomalyScore(resolveAnomalyScore(response));
        prediction.setRulHours(response.getRul_hours());
        prediction.setRulDays(response.getRul_days());
        prediction.setFinalDecision(firstNonBlank(response.getDecision(), "SURVEILLANCE"));
        prediction.setModelName(firstNonBlank(response.getModel_name(), "diagnostic_model"));
        prediction.setModelVersion(response.getModel_version() != null ? String.valueOf(response.getModel_version()) : null);
        prediction.setExplanation(response.getExplanation());
        prediction.setInputFeaturesJson(toJson(response.getInput_data()));
        prediction.setRawOutputJson(toJson(response));

        DecisionThresholdConfig thresholds = thresholdService.getCurrent();
        double risk = normalizedRisk(prediction);
        prediction.setNiveauRisque(toSeverity(risk, thresholds));
        prediction.setStatutPredit(toMachineStatus(prediction.getNiveauRisque()));
        prediction.setConfiance(confidenceAsPercent(response));

        return predictionRepository.save(prediction);
    }

    public Prediction persistRulePrediction(Mesure mesure, String label, double probability, double anomalyScore, String explanation) {
        Prediction prediction = new Prediction();
        prediction.setMesure(mesure);
        prediction.setMachine(resolveMachine(mesure));
        prediction.setDateCreation(LocalDateTime.now());
        prediction.setOutputLabel(label);
        prediction.setProbability(probability);
        prediction.setAnomalyScore(anomalyScore);
        prediction.setFinalDecision(decisionFromRisk(Math.max(probability, anomalyScore / 100.0)));
        prediction.setModelName("backend-rule");
        prediction.setModelVersion("1");
        prediction.setExplanation(explanation);
        Map<String, Object> features = new LinkedHashMap<>();
        features.put("temperature", mesure.getTemperature());
        features.put("courant", mesure.getCourant());
        features.put("vibration", mesure.getVibration());
        features.put("rpm", mesure.getRpm());
        prediction.setInputFeaturesJson(toJson(features));

        DecisionThresholdConfig thresholds = thresholdService.getCurrent();
        double risk = normalizedRisk(prediction);
        prediction.setNiveauRisque(toSeverity(risk, thresholds));
        prediction.setStatutPredit(toMachineStatus(prediction.getNiveauRisque()));
        prediction.setConfiance(Math.round(probability * 10000.0) / 100.0);
        prediction.setRawOutputJson(toJson(Map.of(
                "label", label,
                "probability", probability,
                "anomaly_score", anomalyScore,
                "explanation", explanation
        )));
        return predictionRepository.save(prediction);
    }

    private Machine resolveMachine(Mesure mesure) {
        return mesure != null ? mesure.getMachine() : null;
    }

    private Double resolveAnomalyScore(AiPredictionResponse response) {
        if (response.getAnomaly_score() != null) {
            return response.getAnomaly_score();
        }
        Map<String, Object> anomaly = response.getAnomaly_detection();
        if (anomaly == null || anomaly.get("risk_score") == null) {
            return null;
        }
        try {
            return Double.parseDouble(String.valueOf(anomaly.get("risk_score")));
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private double confidenceAsPercent(AiPredictionResponse response) {
        Double confidence = firstNonNull(response.getConfidence(), response.getProbability());
        if (confidence == null) {
            return 0.0;
        }
        return confidence <= 1.0 ? Math.round(confidence * 10000.0) / 100.0 : confidence;
    }

    private double normalizedRisk(Prediction prediction) {
        double probability = prediction.getProbability() != null ? prediction.getProbability() : 0.0;
        if (probability > 1.0) {
            probability = probability / 100.0;
        }
        double anomaly = prediction.getAnomalyScore() != null ? prediction.getAnomalyScore() / 100.0 : 0.0;
        return Math.max(probability, anomaly);
    }

    private GraviteType toSeverity(double risk, DecisionThresholdConfig thresholds) {
        if (risk >= thresholds.getStopThreshold()) {
            return GraviteType.CRITIQUE;
        }
        if (risk >= thresholds.getUrgentThreshold()) {
            return GraviteType.ELEVEE;
        }
        if (risk >= thresholds.getWarningThreshold()) {
            return GraviteType.MOYENNE;
        }
        return GraviteType.FAIBLE;
    }

    private StatutMachine toMachineStatus(GraviteType severity) {
        if (severity == GraviteType.CRITIQUE) {
            return StatutMachine.CRITIQUE;
        }
        if (severity == GraviteType.ELEVEE || severity == GraviteType.MOYENNE) {
            return StatutMachine.ALERTE;
        }
        return StatutMachine.NORMAL;
    }

    private String decisionFromRisk(double risk) {
        DecisionThresholdConfig thresholds = thresholdService.getCurrent();
        if (risk >= thresholds.getStopThreshold()) {
            return "ARRET_RECOMMANDE";
        }
        if (risk >= thresholds.getUrgentThreshold()) {
            return "INTERVENTION_URGENTE";
        }
        if (risk >= thresholds.getWarningThreshold()) {
            return "MAINTENANCE_PLANIFIEE";
        }
        return "SURVEILLANCE";
    }

    private String toJson(Object value) {
        if (value == null) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException ex) {
            return "{\"serialization_error\":\"" + ex.getMessage().replace("\"", "'") + "\"}";
        }
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return null;
    }

    private Double firstNonNull(Double... values) {
        for (Double value : values) {
            if (value != null) {
                return value;
            }
        }
        return null;
    }
}
