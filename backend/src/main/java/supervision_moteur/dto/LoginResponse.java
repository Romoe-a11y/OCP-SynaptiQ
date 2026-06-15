package supervision_moteur.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class LoginResponse {
    private Long id;
    private String nomComplet;
    private String email;
    private String role;
    private String message;
    private String accessToken;
    private String refreshToken;
}