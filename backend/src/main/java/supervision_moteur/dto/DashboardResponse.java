package supervision_moteur.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DashboardResponse {

    private MesureDashboardDto derniereMesure;
    private List<AlerteDashboardDto> alertes;
    private List<AnomalieDashboardDto> anomalies;
    private List<PredictionDashboardDto> predictions;
}