package supervision_moteur.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DashboardStatsDto {
    private long totalMesures;
    private long totalAnomalies;
    private long totalAlertesActives;
    private long totalPredictionsCritiques;
}