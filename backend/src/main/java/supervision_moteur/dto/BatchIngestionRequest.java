package supervision_moteur.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class BatchIngestionRequest {
    private List<LiveMeasurementRequest> measurements;
    private Boolean runPrediction;
}
