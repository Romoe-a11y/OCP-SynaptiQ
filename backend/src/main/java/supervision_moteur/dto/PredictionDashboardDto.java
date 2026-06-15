package supervision_moteur.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PredictionDashboardDto {

    private Long id;
    private String statutPredit;
    private String niveauRisque;
    private Double confiance;
    private String dateCreation;
}