package supervision_moteur.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import supervision_moteur.enums.GraviteType;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AlertCreateRequest {
    private Long machineId;
    private Long anomalieId;
    private String message;
    private GraviteType severity;
    private String assignedTechnician;
    private LocalDateTime slaDeadline;
    private String notificationChannel;
}
