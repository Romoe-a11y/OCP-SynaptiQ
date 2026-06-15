package supervision_moteur.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import supervision_moteur.enums.RoleUtilisateur;

import java.time.LocalDateTime;

@Entity
@Table(name = "utilisateurs")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Utilisateur {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "nom_complet", nullable = false, length = 100)
    private String nomComplet;

    @Column(nullable = false, unique = true, length = 120)
    private String email;

    @Column(name = "mot_de_passe", nullable = false, length = 255)
    private String motDePasse;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RoleUtilisateur role;

    @Column(name = "date_creation")
    private LocalDateTime dateCreation;

    // V3 production-hardening fields
    @Column(name = "last_login_at")
    private LocalDateTime lastLoginAt;

    @Column(name = "login_count")
    private Integer loginCount = 0;

    @Column(name = "account_locked")
    private Boolean accountLocked = false;

    @Column(name = "failed_attempts")
    private Integer failedAttempts = 0;

    @Column(name = "notification_email")
    private Boolean notificationEmail = true;

    @Column(name = "notification_webhook", length = 500)
    private String notificationWebhook;

    @Column(name = "profile_picture_url", columnDefinition = "TEXT")
    private String profilePictureUrl;
}
