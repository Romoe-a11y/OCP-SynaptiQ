package supervision_moteur.controller;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import supervision_moteur.dto.LoginRequest;
import supervision_moteur.dto.LoginResponse;
import supervision_moteur.dto.PasswordChangeRequest;
import supervision_moteur.dto.ProfileResponse;
import supervision_moteur.dto.ProfileUpdateRequest;
import supervision_moteur.entity.Utilisateur;
import supervision_moteur.repository.UtilisateurRepository;
import supervision_moteur.security.JwtService;

import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UtilisateurRepository utilisateurRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request) {
        Utilisateur utilisateur = utilisateurRepository.findByEmail(request.getEmail().trim().toLowerCase())
                .orElse(null);

        if (utilisateur == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Invalid email or password", "status", 401, "timestamp", LocalDateTime.now()));
        }

        // Check account locked
        if (Boolean.TRUE.equals(utilisateur.getAccountLocked())) {
            return ResponseEntity.status(HttpStatus.LOCKED)
                    .body(Map.of("error", "Account is inactive or locked. Contact an administrator.", "status", 423, "timestamp", LocalDateTime.now()));
        }

        if (!passwordMatches(request.getMotDePasse(), utilisateur.getMotDePasse())) {
            // Track failed attempts
            int attempts = (utilisateur.getFailedAttempts() == null ? 0 : utilisateur.getFailedAttempts()) + 1;
            utilisateur.setFailedAttempts(attempts);
            if (attempts >= 5) {
                utilisateur.setAccountLocked(true);
            }
            utilisateurRepository.save(utilisateur);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Invalid email or password", "status", 401, "timestamp", LocalDateTime.now()));
        }

        // Reset failed attempts on successful login
        upgradeLegacyPasswordIfNeeded(utilisateur, request.getMotDePasse());
        utilisateur.setFailedAttempts(0);
        utilisateur.setAccountLocked(false);
        utilisateur.setLastLoginAt(LocalDateTime.now());
        utilisateur.setLoginCount((utilisateur.getLoginCount() == null ? 0 : utilisateur.getLoginCount()) + 1);
        utilisateurRepository.save(utilisateur);

        String accessToken = jwtService.generateAccessToken(
                utilisateur.getId(),
                utilisateur.getEmail(),
                utilisateur.getRole().name()
        );
        String refreshToken = jwtService.generateRefreshToken(
                utilisateur.getId(),
                utilisateur.getEmail()
        );

        LoginResponse response = new LoginResponse(
                utilisateur.getId(),
                utilisateur.getNomComplet(),
                utilisateur.getEmail(),
                utilisateur.getRole().name(),
                "Login successful",
                accessToken,
                refreshToken
        );

        return ResponseEntity.ok(response);
    }

    private boolean passwordMatches(String rawPassword, String storedPassword) {
        if (storedPassword == null) {
            return false;
        }

        try {
            if (passwordEncoder.matches(rawPassword, storedPassword)) {
                return true;
            }
        } catch (IllegalArgumentException ignored) {
            // Older local seed dumps stored passwords as plain text. A successful
            // legacy login is upgraded to bcrypt before the response is returned.
        }

        return rawPassword.equals(storedPassword);
    }

    private void upgradeLegacyPasswordIfNeeded(Utilisateur utilisateur, String rawPassword) {
        String storedPassword = utilisateur.getMotDePasse();
        if (storedPassword == null || storedPassword.startsWith("$2a$") ||
                storedPassword.startsWith("$2b$") || storedPassword.startsWith("$2y$")) {
            return;
        }

        utilisateur.setMotDePasse(passwordEncoder.encode(rawPassword));
    }

    @PostMapping("/refresh")
    public ResponseEntity<?> refresh(@RequestBody Map<String, String> body) {
        String refreshToken = body.get("refreshToken");

        if (refreshToken == null || !jwtService.isValid(refreshToken)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Invalid refresh token", "status", 401));
        }

        if (!"refresh".equals(jwtService.getTokenType(refreshToken))) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Not a refresh token", "status", 401));
        }

        String email = jwtService.getEmail(refreshToken);
        Utilisateur utilisateur = utilisateurRepository.findByEmail(email).orElse(null);

        if (utilisateur == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "User not found", "status", 401));
        }

        String newAccessToken = jwtService.generateAccessToken(
                utilisateur.getId(),
                utilisateur.getEmail(),
                utilisateur.getRole().name()
        );

        return ResponseEntity.ok(Map.of(
                "accessToken", newAccessToken,
                "tokenType", "Bearer"
        ));
    }

    @GetMapping("/me")
    public ResponseEntity<?> me() {
        Utilisateur utilisateur = getAuthenticatedUser();
        if (utilisateur == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Not authenticated"));
        }

        return ResponseEntity.ok(toProfileResponse(utilisateur, null, null));
    }

    @PutMapping("/profile")
    public ResponseEntity<?> updateProfile(@Valid @RequestBody ProfileUpdateRequest request) {
        Utilisateur utilisateur = getAuthenticatedUser();
        if (utilisateur == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Not authenticated"));
        }

        String nextEmail = request.getEmail().trim().toLowerCase();
        boolean emailTaken = utilisateurRepository.findByEmail(nextEmail)
                .filter(existing -> !existing.getId().equals(utilisateur.getId()))
                .isPresent();
        if (emailTaken) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("error", "Email is already used by another account", "status", 409));
        }

        utilisateur.setNomComplet(request.getNomComplet().trim());
        utilisateur.setEmail(nextEmail);
        utilisateur.setNotificationEmail(Boolean.TRUE.equals(request.getNotificationEmail()));
        utilisateur.setNotificationWebhook(normalizeOptionalText(request.getNotificationWebhook()));
        utilisateurRepository.save(utilisateur);

        String accessToken = jwtService.generateAccessToken(
                utilisateur.getId(),
                utilisateur.getEmail(),
                utilisateur.getRole().name()
        );
        String refreshToken = jwtService.generateRefreshToken(
                utilisateur.getId(),
                utilisateur.getEmail()
        );

        return ResponseEntity.ok(toProfileResponse(utilisateur, accessToken, refreshToken));
    }

    @PostMapping("/profile-picture")
    public ResponseEntity<?> uploadProfilePicture(@RequestParam("file") MultipartFile file) {
        Utilisateur utilisateur = getAuthenticatedUser();
        if (utilisateur == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Not authenticated"));
        }

        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "No file provided"));
        }

        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            return ResponseEntity.badRequest().body(Map.of("error", "Only image files are allowed"));
        }

        if (file.getSize() > 2 * 1024 * 1024) {
            return ResponseEntity.badRequest().body(Map.of("error", "File size must be under 2 MB"));
        }

        try {
            String base64 = Base64.getEncoder().encodeToString(file.getBytes());
            String dataUrl = "data:" + contentType + ";base64," + base64;
            utilisateur.setProfilePictureUrl(dataUrl);
            utilisateurRepository.save(utilisateur);
            return ResponseEntity.ok(Map.of("profilePictureUrl", dataUrl, "message", "Profile picture updated"));
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to process the image"));
        }
    }

    @DeleteMapping("/profile-picture")
    public ResponseEntity<?> deleteProfilePicture() {
        Utilisateur utilisateur = getAuthenticatedUser();
        if (utilisateur == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Not authenticated"));
        }
        utilisateur.setProfilePictureUrl(null);
        utilisateurRepository.save(utilisateur);
        return ResponseEntity.ok(Map.of("message", "Profile picture removed"));
    }

    @PostMapping("/password")
    public ResponseEntity<?> changePassword(@Valid @RequestBody PasswordChangeRequest request) {
        Utilisateur utilisateur = getAuthenticatedUser();
        if (utilisateur == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Not authenticated"));
        }

        if (!passwordMatches(request.getCurrentPassword(), utilisateur.getMotDePasse())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Current password is incorrect", "status", 401));
        }

        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "New password and confirmation do not match", "status", 400));
        }

        if (passwordMatches(request.getNewPassword(), utilisateur.getMotDePasse())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "New password must be different from the current password", "status", 400));
        }

        utilisateur.setMotDePasse(passwordEncoder.encode(request.getNewPassword()));
        utilisateur.setFailedAttempts(0);
        utilisateur.setAccountLocked(false);
        utilisateurRepository.save(utilisateur);

        return ResponseEntity.ok(Map.of("message", "Password updated successfully"));
    }

    private Utilisateur getAuthenticatedUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return null;
        }

        Object details = auth.getDetails();
        if (details instanceof Long userId) {
            return utilisateurRepository.findById(userId).orElse(null);
        }
        if (details instanceof Number num) {
            return utilisateurRepository.findById(num.longValue()).orElse(null);
        }

        return utilisateurRepository.findByEmail(auth.getName()).orElse(null);
    }

    private ProfileResponse toProfileResponse(Utilisateur utilisateur, String accessToken, String refreshToken) {
        return new ProfileResponse(
                utilisateur.getId(),
                utilisateur.getNomComplet(),
                utilisateur.getEmail(),
                utilisateur.getRole().name(),
                utilisateur.getDateCreation(),
                utilisateur.getLastLoginAt(),
                utilisateur.getLoginCount(),
                utilisateur.getAccountLocked(),
                utilisateur.getFailedAttempts(),
                utilisateur.getNotificationEmail(),
                utilisateur.getNotificationWebhook(),
                utilisateur.getProfilePictureUrl(),
                accessToken,
                refreshToken
        );
    }

    private String normalizeOptionalText(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
