package supervision_moteur.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import supervision_moteur.enums.RoleUtilisateur;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UtilisateurDto {

    private Long id;
    private String nomComplet;
    private String email;
    private RoleUtilisateur role;
    private LocalDateTime dateCreation;
    private LocalDateTime lastLoginAt;
    private Integer loginCount;
    private Boolean accountLocked;
    private Integer failedAttempts;
    private Boolean notificationEmail;
    private String notificationWebhook;
    private Boolean active;
    private String temporaryPassword;
}
