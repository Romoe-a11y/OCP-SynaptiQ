package supervision_moteur.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class OperationalDashboardResponse {
    private List<Map<String, Object>> riskTimeline;
    private List<Map<String, Object>> activeMachineStatus;
    private List<Map<String, Object>> anomalyScoreTrend;
    private List<Map<String, Object>> featureTrends;
    private List<Map<String, Object>> alertHistory;
    private Map<String, Object> modelHealth;
    private Map<String, Object> driftHealth;
    private List<Map<String, Object>> rulTrend;
    private List<Map<String, Object>> predictionExplanations;
}
