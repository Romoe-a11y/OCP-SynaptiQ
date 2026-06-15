package supervision_moteur.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import supervision_moteur.enums.GraviteType;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class FailureHistoryRequest {
    private Long machineId;
    private LocalDateTime failureDate;
    private String replacedComponent;
    private String technicianDiagnosis;
    private Long downtimeDurationMinutes;
    private String repairAction;
    private String actualRootCause;
    private GraviteType severity;
    private String notes;
}
