package supervision_moteur.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AnomalieDashboardDto {

    private Long id;
    private String type;
    private String description;
    private String gravite;
    private Double score;
    private String dateDetection;
}