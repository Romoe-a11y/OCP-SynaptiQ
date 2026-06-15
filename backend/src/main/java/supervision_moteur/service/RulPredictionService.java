package supervision_moteur.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import supervision_moteur.dto.RulPredictionResponse;
import supervision_moteur.entity.Machine;
import supervision_moteur.entity.Mesure;
import supervision_moteur.entity.RulPrediction;
import supervision_moteur.repository.MachineRepository;
import supervision_moteur.repository.MesureRepository;
import supervision_moteur.repository.RulPredictionRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class RulPredictionService {

    private final AiPredictionService aiPredictionService;
    private final MesureRepository mesureRepository;
    private final MachineRepository machineRepository;
    private final RulPredictionRepository rulPredictionRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public RulPrediction predictForMachine(Long machineId) {
        Machine machine = machineRepository.findById(machineId)
                .orElseThrow(() -> new IllegalArgumentException("Machine not found: " + machineId));
        Mesure mesure = mesureRepository.findTopByMachineIdOrderByHorodatageDesc(machineId)
                .orElseThrow(() -> new IllegalArgumentException("No measurement found for machine: " + machineId));
        Map<String, Object> result = aiPredictionService.predictRul(mesure);

        RulPrediction prediction = new RulPrediction();
        prediction.setMachine(machine);
        prediction.setMesure(mesure);
        prediction.setPredictedAt(LocalDateTime.now());
        prediction.setRulHours(asDouble(result.get("rul_hours")));
        prediction.setRulDays(asDouble(result.get("rul_days")));
        prediction.setTimeToFailureHours(asDouble(result.get("time_to_failure_hours")));
        prediction.setConfidence(asDouble(result.get("confidence")));
        prediction.setMethod(String.valueOf(result.getOrDefault("method", "unknown")));
        prediction.setSimulated(Boolean.parseBoolean(String.valueOf(result.getOrDefault("simulated", false))));
        prediction.setExplanation(String.valueOf(result.getOrDefault("explanation", "")));
        prediction.setRawOutputJson(toJson(result));
        return rulPredictionRepository.save(prediction);
    }

    public List<RulPrediction> trend(Long machineId) {
        if (machineId != null) {
            return rulPredictionRepository.findTop20ByMachineIdOrderByPredictedAtDesc(machineId);
        }
        return rulPredictionRepository.findTop20ByOrderByPredictedAtDesc();
    }

    public RulPredictionResponse toResponse(RulPrediction prediction) {
        return new RulPredictionResponse(
                prediction.getMachine() != null ? prediction.getMachine().getId() : null,
                prediction.getPredictedAt(),
                prediction.getRulHours(),
                prediction.getRulDays(),
                prediction.getConfidence(),
                prediction.getMethod(),
                prediction.getSimulated(),
                prediction.getExplanation()
        );
    }

    private Double asDouble(Object value) {
        if (value == null) {
            return null;
        }
        try {
            return Double.parseDouble(String.valueOf(value));
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private String toJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException ex) {
            return "{}";
        }
    }
}
