package supervision_moteur.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import supervision_moteur.dto.UtilisateurCreateRequest;
import supervision_moteur.dto.UtilisateurDto;
import supervision_moteur.dto.UtilisateurUpdateRequest;
import supervision_moteur.entity.Utilisateur;
import supervision_moteur.enums.RoleUtilisateur;
import supervision_moteur.repository.UtilisateurRepository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/utilisateurs")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class UtilisateurController {

    private static final String TEMP_PASSWORD_CHARS =
            "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
    private static final int TEMP_PASSWORD_LENGTH = 14;
    private static final SecureRandom RANDOM = new SecureRandom();

    private final UtilisateurRepository utilisateurRepository;
    private final PasswordEncoder passwordEncoder;
    private final JdbcTemplate jdbcTemplate;

    @GetMapping
    public List<UtilisateurDto> getAllUtilisateurs() {
        return jdbcTemplate.query(
                """
                        SELECT id, nom_complet, email, role, date_creation, last_login_at,
                               login_count, account_locked, failed_attempts,
                               notification_email, notification_webhook
                        FROM utilisateurs
                        ORDER BY
                          CASE WHEN role = 'ADMIN' THEN 0 ELSE 1 END,
                          LOWER(nom_complet)
                        """,
                (rs, rowNum) -> toDto(rs)
        );
    }

    @PostMapping
    public ResponseEntity<?> createUtilisateur(@Valid @RequestBody UtilisateurCreateRequest request) {
        String email = normalizeEmail(request.getEmail());
        if (utilisateurRepository.existsByEmail(email)) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("error", "Email is already used by another account", "status", 409));
        }

        String rawPassword = normalizeOptionalText(request.getPassword());
        boolean generatedPassword = rawPassword == null;
        if (generatedPassword) {
            rawPassword = generateTemporaryPassword();
        } else if (rawPassword.length() < 8) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Password must be at least 8 characters", "status", 400));
        }

        Utilisateur utilisateur = new Utilisateur();
        utilisateur.setNomComplet(request.getNomComplet().trim());
        utilisateur.setEmail(email);
        utilisateur.setMotDePasse(passwordEncoder.encode(rawPassword));
        utilisateur.setRole(request.getRole());
        utilisateur.setDateCreation(LocalDateTime.now());
        utilisateur.setAccountLocked(!Boolean.TRUE.equals(request.getActive()));
        utilisateur.setFailedAttempts(0);
        utilisateur.setLoginCount(0);
        utilisateur.setNotificationEmail(Boolean.TRUE.equals(request.getNotificationEmail()));
        utilisateur.setNotificationWebhook(normalizeOptionalText(request.getNotificationWebhook()));

        Utilisateur saved = utilisateurRepository.save(utilisateur);
        UtilisateurDto response = toDto(saved);
        response.setTemporaryPassword(generatedPassword ? rawPassword : null);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateUtilisateur(
            @PathVariable Long id,
            @Valid @RequestBody UtilisateurUpdateRequest request
    ) {
        UtilisateurDto existing = findDtoById(id);
        if (existing == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "User not found", "status", 404));
        }

        String email = normalizeEmail(request.getEmail());
        boolean emailTaken = utilisateurRepository.existsByEmailAndIdNot(email, id);
        if (emailTaken) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("error", "Email is already used by another account", "status", 409));
        }

        boolean nextActive = Boolean.TRUE.equals(request.getActive());
        boolean wouldRemoveActiveAdmin = RoleUtilisateur.ADMIN.equals(existing.getRole()) &&
                Boolean.TRUE.equals(existing.getActive()) &&
                (!RoleUtilisateur.ADMIN.equals(request.getRole()) || !nextActive);
        if (wouldRemoveActiveAdmin && !hasAnotherActiveAdmin(id)) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "At least one active administrator must remain", "status", 400));
        }

        Long currentUserId = getCurrentUserId();
        if (id.equals(currentUserId) && (!RoleUtilisateur.ADMIN.equals(request.getRole()) || !nextActive)) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "You cannot deactivate or demote your own administrator account", "status", 400));
        }

        jdbcTemplate.update(
                """
                        UPDATE utilisateurs
                        SET nom_complet = ?,
                            email = ?,
                            role = ?,
                            account_locked = ?,
                            failed_attempts = CASE WHEN ? THEN 0 ELSE failed_attempts END,
                            notification_email = ?,
                            notification_webhook = ?
                        WHERE id = ?
                        """,
                request.getNomComplet().trim(),
                email,
                request.getRole().name(),
                !nextActive,
                nextActive,
                Boolean.TRUE.equals(request.getNotificationEmail()),
                normalizeOptionalText(request.getNotificationWebhook()),
                id
        );

        return ResponseEntity.ok(findDtoById(id));
    }

    @PostMapping("/{id}/reset-password")
    public ResponseEntity<?> resetPassword(@PathVariable Long id) {
        UtilisateurDto existing = findDtoById(id);
        if (existing == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "User not found", "status", 404));
        }

        String temporaryPassword = generateTemporaryPassword();
        jdbcTemplate.update(
                "UPDATE utilisateurs SET mot_de_passe = ?, failed_attempts = 0 WHERE id = ?",
                passwordEncoder.encode(temporaryPassword),
                id
        );

        UtilisateurDto response = findDtoById(id);
        response.setTemporaryPassword(temporaryPassword);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteUtilisateur(@PathVariable Long id) {
        UtilisateurDto existing = findDtoById(id);
        if (existing == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "User not found", "status", 404));
        }

        Long currentUserId = getCurrentUserId();
        if (id.equals(currentUserId)) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "You cannot remove your own account while signed in", "status", 400));
        }

        if (RoleUtilisateur.ADMIN.equals(existing.getRole()) &&
                Boolean.TRUE.equals(existing.getActive()) &&
                !hasAnotherActiveAdmin(id)) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "At least one active administrator must remain", "status", 400));
        }

        jdbcTemplate.update("DELETE FROM utilisateurs WHERE id = ?", id);
        return ResponseEntity.noContent().build();
    }

    // ---------------------------------------------------------------
    // Private helpers
    // ---------------------------------------------------------------

    private UtilisateurDto toDto(Utilisateur u) {
        Boolean active = !Boolean.TRUE.equals(u.getAccountLocked());
        return new UtilisateurDto(
                u.getId(),
                u.getNomComplet(),
                u.getEmail(),
                u.getRole(),
                u.getDateCreation(),
                u.getLastLoginAt(),
                u.getLoginCount(),
                u.getAccountLocked(),
                u.getFailedAttempts(),
                u.getNotificationEmail(),
                u.getNotificationWebhook(),
                active,
                null
        );
    }

    private boolean hasAnotherActiveAdmin(Long excludedUserId) {
        Integer count = jdbcTemplate.queryForObject(
                """
                        SELECT COUNT(*)
                        FROM utilisateurs
                        WHERE id <> ?
                          AND role = 'ADMIN'
                          AND COALESCE(account_locked, FALSE) = FALSE
                        """,
                Integer.class,
                excludedUserId
        );
        return count != null && count > 0;
    }

    private UtilisateurDto findDtoById(Long id) {
        List<UtilisateurDto> users = jdbcTemplate.query(
                """
                        SELECT id, nom_complet, email, role, date_creation, last_login_at,
                               login_count, account_locked, failed_attempts,
                               notification_email, notification_webhook
                        FROM utilisateurs
                        WHERE id = ?
                        """,
                (rs, rowNum) -> toDto(rs),
                id
        );
        return users.isEmpty() ? null : users.get(0);
    }

    private UtilisateurDto toDto(ResultSet rs) throws SQLException {
        Boolean accountLocked = getNullableBoolean(rs, "account_locked");
        Boolean active = !Boolean.TRUE.equals(accountLocked);
        return new UtilisateurDto(
                rs.getLong("id"),
                rs.getString("nom_complet"),
                rs.getString("email"),
                parseRole(rs.getString("role")),
                getLocalDateTime(rs, "date_creation"),
                getLocalDateTime(rs, "last_login_at"),
                getNullableInteger(rs, "login_count"),
                accountLocked,
                getNullableInteger(rs, "failed_attempts"),
                getNullableBoolean(rs, "notification_email"),
                rs.getString("notification_webhook"),
                active,
                null
        );
    }

    private RoleUtilisateur parseRole(String role) {
        try {
            return RoleUtilisateur.valueOf(role);
        } catch (IllegalArgumentException | NullPointerException ignored) {
            return RoleUtilisateur.UTILISATEUR;
        }
    }

    private LocalDateTime getLocalDateTime(ResultSet rs, String column) throws SQLException {
        Timestamp timestamp = rs.getTimestamp(column);
        return timestamp == null ? null : timestamp.toLocalDateTime();
    }

    private Integer getNullableInteger(ResultSet rs, String column) throws SQLException {
        int value = rs.getInt(column);
        return rs.wasNull() ? null : value;
    }

    private Boolean getNullableBoolean(ResultSet rs, String column) throws SQLException {
        boolean value = rs.getBoolean(column);
        return rs.wasNull() ? null : value;
    }

    private Long getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return null;
        }

        Object details = auth.getDetails();
        if (details instanceof Long userId) return userId;
        if (details instanceof Number num) return num.longValue();
        return null;
    }

    private String normalizeEmail(String value) {
        return value.trim().toLowerCase();
    }

    private String normalizeOptionalText(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String generateTemporaryPassword() {
        StringBuilder password = new StringBuilder(TEMP_PASSWORD_LENGTH);
        for (int i = 0; i < TEMP_PASSWORD_LENGTH; i++) {
            password.append(TEMP_PASSWORD_CHARS.charAt(RANDOM.nextInt(TEMP_PASSWORD_CHARS.length())));
        }
        return password.toString();
    }
}
