package supervision_moteur.config;

// CORS is now handled by SecurityConfig.
// This file is kept empty to avoid breaking imports elsewhere.
// The CorsConfigurationSource bean is defined in supervision_moteur.security.SecurityConfig.

import org.springframework.context.annotation.Configuration;

@Configuration
public class CorsConfig {
    // Intentionally empty — CORS managed by SecurityConfig
}
