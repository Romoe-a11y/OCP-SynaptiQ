package supervision_moteur.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AiPredictionResponse {
    private String diagnostic_label;
    private String classifier_label;
    private String cause_probable;
    private String recommandation;
    private String decision;
    private Double confidence;
    private Double probability;
    private Double anomaly_score;
    private Double rul_hours;
    private Double rul_days;
    private String model_name;
    private Object model_version;
    private String explanation;
    private Map<String, Object> anomaly_detection;
    private Map<String, Object> top_contributing_features;
    private Map<String, Object> input_data;
    private Map<String, Object> raw_output;
}
