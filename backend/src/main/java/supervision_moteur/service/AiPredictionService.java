package supervision_moteur.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import supervision_moteur.dto.AiPredictionRequest;
import supervision_moteur.dto.AiPredictionResponse;
import supervision_moteur.entity.Mesure;
import supervision_moteur.repository.MesureRepository;

import java.util.LinkedHashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AiPredictionService {

    private final RestTemplate restTemplate;
    private final MesureRepository mesureRepository;

    @Value("${ai.service.base-url:http://localhost:5001}")
    private String aiBaseUrl;

    public AiPredictionResponse predict(AiPredictionRequest request) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<AiPredictionRequest> entity = new HttpEntity<>(request, headers);

        try {
            return restTemplate.postForObject(
                    aiBaseUrl + "/predict",
                    entity,
                    AiPredictionResponse.class
            );
        } catch (Exception ex) {
            return fallbackPrediction(request, ex.getMessage());
        }
    }

    public Map<String, Object> predictRul(Mesure mesure) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("machine_id", mesure.getMachine().getId());
        payload.put("temperature", mesure.getTemperature());
        payload.put("courant", mesure.getCourant());
        payload.put("vibration", mesure.getVibration());
        payload.put("couple", estimateCouple(mesure));
        payload.put("rpm", mesure.getRpm() != null ? mesure.getRpm() : 0.0);
        payload.put("failure_probability", estimateFailureProbability(mesure));
        payload.put("component_health_score", estimateComponentHealthScore(mesure));

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> result = restTemplate.postForObject(
                    aiBaseUrl + "/predict-rul",
                    new HttpEntity<>(payload, headers),
                    Map.class
            );
            return result != null ? result : fallbackRul(mesure, "empty AI response");
        } catch (Exception ex) {
            return fallbackRul(mesure, ex.getMessage());
        }
    }

    public AiPredictionResponse predictDerniereMesure() {
        Mesure mesure = mesureRepository.findTopByOrderByHorodatageDesc()
                .orElseThrow(() -> new RuntimeException("Aucune mesure trouvée dans la base de données."));

        AiPredictionRequest request = new AiPredictionRequest(
                mesure.getTemperature(),
                mesure.getCourant(),
                mesure.getVibration(),
                estimateCouple(mesure),
                mesure.getRpm() != null ? mesure.getRpm() : 0.0,
                estimateFailureProbability(mesure),
                estimateComponentHealthScore(mesure)
        );

        return predict(request);
    }

    public AiPredictionRequest requestFromMesure(Mesure mesure) {
        return new AiPredictionRequest(
                mesure.getTemperature(),
                mesure.getCourant(),
                mesure.getVibration(),
                estimateCouple(mesure),
                mesure.getRpm() != null ? mesure.getRpm() : 0.0,
                estimateFailureProbability(mesure),
                estimateComponentHealthScore(mesure)
        );
    }

    private AiPredictionResponse fallbackPrediction(AiPredictionRequest request, String error) {
        double failureProbability = request.getFailure_probability() != null ? request.getFailure_probability() : 0.0;
        double health = request.getComponent_health_score() != null ? request.getComponent_health_score() : 1.0;
        double vibration = request.getVibration() != null ? request.getVibration() : 0.0;
        double temperature = request.getTemperature() != null ? request.getTemperature() : 0.0;
        String label = "NORMAL";
        String decision = "SURVEILLANCE";
        double confidence = 0.65;

        if (failureProbability >= 0.75 || health <= 0.35 || temperature >= 90 || vibration >= 1.6) {
            label = "ETAT_CRITIQUE_GENERAL";
            decision = "ARRET_RECOMMANDE";
            confidence = 0.82;
        } else if (failureProbability >= 0.45 || health <= 0.60 || temperature >= 80 || vibration >= 1.1) {
            label = "USURE_MECANIQUE_PROBABLE";
            decision = "INSPECTION_PRIORITAIRE";
            confidence = 0.74;
        }

        AiPredictionResponse response = new AiPredictionResponse();
        response.setDiagnostic_label(label);
        response.setClassifier_label("RULE_FALLBACK");
        response.setCause_probable("AI service unavailable; rule-based backend fallback used");
        response.setRecommandation("Verify AI service availability and inspect the latest sensor window");
        response.setDecision(decision);
        response.setConfidence(confidence);
        response.setProbability(failureProbability);
        response.setAnomaly_score(Math.max(failureProbability * 100.0, (1.0 - health) * 100.0));
        response.setModel_name("backend-rule-fallback");
        response.setModel_version("fallback-1");
        response.setExplanation("Fallback decision because AI endpoint failed: " + error);
        Map<String, Object> inputData = new LinkedHashMap<>();
        inputData.put("temperature", request.getTemperature());
        inputData.put("courant", request.getCourant());
        inputData.put("vibration", request.getVibration());
        inputData.put("couple", request.getCouple());
        inputData.put("rpm", request.getRpm());
        inputData.put("failure_probability", request.getFailure_probability());
        inputData.put("component_health_score", request.getComponent_health_score());
        response.setInput_data(inputData);
        return response;
    }

    private Map<String, Object> fallbackRul(Mesure mesure, String reason) {
        double risk = estimateFailureProbability(mesure);
        double health = estimateComponentHealthScore(mesure);
        double hours = Math.max(6.0, 720.0 * health * (1.0 - Math.min(0.85, risk)));
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("machine_id", mesure.getMachine().getId());
        result.put("rul_hours", hours);
        result.put("rul_days", hours / 24.0);
        result.put("confidence", 0.45);
        result.put("method", "backend_proxy_rul");
        result.put("simulated", true);
        result.put("explanation", "Simulated proxy RUL because AI RUL endpoint is unavailable: " + reason);
        return result;
    }

    private Double estimateCouple(Mesure mesure) {
        if (mesure.getRpm() == null || mesure.getRpm() == 0) {
            return 150.0;
        }
        return Math.max(100.0, (mesure.getCourant() != null ? Math.abs(mesure.getCourant()) * 4.5 : 150.0));
    }

    private Double estimateFailureProbability(Mesure mesure) {
        double score = 0.0;

        if (mesure.getTemperature() != null) {
            if (mesure.getTemperature() >= 85) score += 0.35;
            else if (mesure.getTemperature() >= 75) score += 0.20;
        }

        if (mesure.getVibration() != null) {
            if (mesure.getVibration() >= 1.2) score += 0.35;
            else if (mesure.getVibration() >= 0.8) score += 0.20;
        }

        if (mesure.getCourant() != null) {
            if (Math.abs(mesure.getCourant()) >= 35) score += 0.20;
            else if (Math.abs(mesure.getCourant()) >= 25) score += 0.10;
        }

        if (mesure.getRpm() != null && mesure.getRpm() < 1450) {
            score += 0.10;
        }

        return Math.min(1.0, score);
    }

    private Double estimateComponentHealthScore(Mesure mesure) {
        double health = 1.0;

        if (mesure.getTemperature() != null) {
            if (mesure.getTemperature() >= 85) health -= 0.30;
            else if (mesure.getTemperature() >= 75) health -= 0.15;
        }

        if (mesure.getVibration() != null) {
            if (mesure.getVibration() >= 1.2) health -= 0.30;
            else if (mesure.getVibration() >= 0.8) health -= 0.15;
        }

        if (mesure.getCourant() != null) {
            if (Math.abs(mesure.getCourant()) >= 35) health -= 0.20;
            else if (Math.abs(mesure.getCourant()) >= 25) health -= 0.10;
        }

        if (mesure.getRpm() != null && mesure.getRpm() < 1450) {
            health -= 0.10;
        }

        return Math.max(0.1, health);
    }
}
