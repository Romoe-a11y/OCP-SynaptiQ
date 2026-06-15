package supervision_moteur.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AlertLifecycleRequest {
    private String user;
    private String technician;
    private String resolutionNotes;
    private String notificationChannel;
}
