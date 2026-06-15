package supervision_moteur.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RulPredictionResponse {
    private Long machineId;
    private LocalDateTime predictedAt;
    private Double rulHours;
    private Double rulDays;
    private Double confidence;
    private String method;
    private Boolean simulated;
    private String explanation;
}
