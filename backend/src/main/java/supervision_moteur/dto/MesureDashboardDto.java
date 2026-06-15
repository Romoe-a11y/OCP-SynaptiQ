package supervision_moteur.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MesureDashboardDto {

    private Long id;
    private String nomMachine;
    private String horodatage;
    private Double temperature;
    private Double courant;
    private Double vibration;
    private Double rpm;
    private String statut;
    private Boolean etiquetteAnomalie;
}