package supervision_moteur.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import supervision_moteur.enums.StatutMachine;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class LiveMeasurementRequest {
    private Long machineId;
    private LocalDateTime horodatage;
    private Double temperature;
    private Double courant;
    private Double vibration;
    private Double rpm;
    private StatutMachine statut;
    private Boolean etiquetteAnomalie;
}
