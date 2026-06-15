package supervision_moteur.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import supervision_moteur.enums.RoleUtilisateur;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UtilisateurUpdateRequest {

    @NotBlank(message = "Full name is required")
    @Size(max = 100, message = "Full name must be 100 characters or fewer")
    private String nomComplet;

    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    @Size(max = 120, message = "Email must be 120 characters or fewer")
    private String email;

    @NotNull(message = "Role is required")
    private RoleUtilisateur role;

    private Boolean active = true;

    private Boolean notificationEmail = true;

    @Size(max = 500, message = "Webhook URL must be 500 characters or fewer")
    private String notificationWebhook;
}
