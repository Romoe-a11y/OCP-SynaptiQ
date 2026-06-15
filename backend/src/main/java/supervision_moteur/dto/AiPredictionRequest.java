package supervision_moteur.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AiPredictionRequest {
    private Double temperature;
    private Double courant;
    private Double vibration;
    private Double couple;
    private Double rpm;
    private Double failure_probability;
    private Double component_health_score;
}