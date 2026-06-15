package supervision_moteur.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProfileResponse {
    private Long id;
    private String nomComplet;
    private String email;
    private String role;
    private LocalDateTime dateCreation;
    private LocalDateTime lastLoginAt;
    private Integer loginCount;
    private Boolean accountLocked;
    private Integer failedAttempts;
    private Boolean notificationEmail;
    private String notificationWebhook;
    private String profilePictureUrl;
    private String accessToken;
    private String refreshToken;
}
