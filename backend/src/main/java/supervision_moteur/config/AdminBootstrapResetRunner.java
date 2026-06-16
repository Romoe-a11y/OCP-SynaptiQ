package supervision_moteur.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import supervision_moteur.entity.Utilisateur;
import supervision_moteur.repository.UtilisateurRepository;

@Slf4j
@Component
@RequiredArgsConstructor
public class AdminBootstrapResetRunner implements ApplicationRunner {

    private final UtilisateurRepository utilisateurRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.admin-bootstrap-reset.enabled:false}")
    private boolean enabled;

    @Value("${app.admin-bootstrap-reset.email:admin@gmail.com}")
    private String email;

    @Value("${app.admin-bootstrap-reset.password:admin123}")
    private String password;

    @Override
    public void run(ApplicationArguments args) {
        if (!enabled) {
            return;
        }

        String normalizedEmail = email.trim().toLowerCase();
        Utilisateur utilisateur = utilisateurRepository.findByEmailIgnoreCase(normalizedEmail)
                .orElse(null);

        if (utilisateur == null) {
            log.warn("Admin bootstrap reset requested, but no user exists with email {}", normalizedEmail);
            return;
        }

        utilisateur.setMotDePasse(passwordEncoder.encode(password));
        utilisateur.setAccountLocked(false);
        utilisateur.setFailedAttempts(0);
        utilisateurRepository.save(utilisateur);

        log.warn("Admin bootstrap reset completed for {}. Disable APP_ADMIN_BOOTSTRAP_RESET after this run.", normalizedEmail);
    }
}
