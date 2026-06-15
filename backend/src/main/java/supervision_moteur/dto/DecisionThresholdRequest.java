package supervision_moteur.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DecisionThresholdRequest {
    private Double warningThreshold;
    private Double urgentThreshold;
    private Double stopThreshold;
    private String tuningGoal;
    private String notes;
}
