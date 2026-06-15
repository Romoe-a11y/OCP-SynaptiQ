package supervision_moteur.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AlerteDashboardDto {

    private Long id;
    private String message;
    private String gravite;
    private String statut;
    private String dateCreation;
}