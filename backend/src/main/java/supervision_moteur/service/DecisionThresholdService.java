package supervision_moteur.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import supervision_moteur.dto.DecisionThresholdRequest;
import supervision_moteur.entity.DecisionThresholdConfig;
import supervision_moteur.repository.DecisionThresholdConfigRepository;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class DecisionThresholdService {

    private final DecisionThresholdConfigRepository repository;

    public DecisionThresholdConfig getCurrent() {
        return repository.findTopByOrderByUpdatedAtDesc().orElseGet(() -> {
            DecisionThresholdConfig config = new DecisionThresholdConfig();
            config.setWarningThreshold(0.45);
            config.setUrgentThreshold(0.70);
            config.setStopThreshold(0.85);
            config.setTuningGoal("BALANCED");
            config.setNotes("Default business thresholds. Raise values to reduce false alarms; lower values to reduce missed critical failures.");
            config.setUpdatedAt(LocalDateTime.now());
            return config;
        });
    }

    public DecisionThresholdConfig save(DecisionThresholdRequest request) {
        DecisionThresholdConfig config = new DecisionThresholdConfig();
        config.setWarningThreshold(valueOrDefault(request.getWarningThreshold(), 0.45));
        config.setUrgentThreshold(valueOrDefault(request.getUrgentThreshold(), 0.70));
        config.setStopThreshold(valueOrDefault(request.getStopThreshold(), 0.85));
        config.setTuningGoal(request.getTuningGoal() != null ? request.getTuningGoal() : "BALANCED");
        config.setNotes(request.getNotes());
        config.setUpdatedAt(LocalDateTime.now());
        return repository.save(config);
    }

    private double valueOrDefault(Double value, double fallback) {
        return value != null ? value : fallback;
    }
}
