package supervision_moteur.service;

import com.resend.Resend;
import com.resend.services.emails.model.CreateEmailOptions;
import com.resend.services.emails.model.CreateEmailResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    public record DeliveryResult(boolean attempted, boolean successful, String message) {
    }

    @Value("${resend.api-key:}")
    private String apiKey;

    @Value("${resend.from:}")
    private String from;

    @Value("${app.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    public boolean isConfigured() {
        return hasText(apiKey) && hasText(from);
    }

    public DeliveryResult sendUserInvite(String email, String fullName, String temporaryPassword, String role) {
        return sendAccessEmail(
                email,
                fullName,
                temporaryPassword,
                role,
                "Your OCP SynaptiQ access is ready",
                "Your OCP SynaptiQ account has been created."
        );
    }

    public DeliveryResult sendPasswordReset(String email, String fullName, String temporaryPassword, String role) {
        return sendAccessEmail(
                email,
                fullName,
                temporaryPassword,
                role,
                "Your OCP SynaptiQ temporary password",
                "Your OCP SynaptiQ password has been reset."
        );
    }

    private DeliveryResult sendAccessEmail(
            String email,
            String fullName,
            String temporaryPassword,
            String role,
            String subject,
            String intro
    ) {
        if (!isConfigured()) {
            String message = "Resend email is not configured. Check RESEND_API_KEY and RESEND_FROM.";
            log.warn("{} Skipping access email for {}", message, email);
            return new DeliveryResult(false, false, message);
        }

        try {
            Resend resend = new Resend(apiKey);
            CreateEmailOptions params = CreateEmailOptions.builder()
                    .from(from)
                    .to(email)
                    .subject(subject)
                    .html(buildAccessHtml(fullName, email, temporaryPassword, role, intro))
                    .text(buildAccessText(fullName, email, temporaryPassword, role, intro))
                    .build();

            CreateEmailResponse response = resend.emails().send(params);
            log.info("Sent OCP SynaptiQ access email to {} through Resend id {}", email, response.getId());
            return new DeliveryResult(true, true, "Email sent through Resend.");
        } catch (Exception ex) {
            log.error("Failed to send OCP SynaptiQ access email to {}: {}", email, ex.getMessage());
            return new DeliveryResult(true, false, ex.getMessage());
        }
    }

    private String buildAccessText(String fullName, String email, String temporaryPassword, String role, String intro) {
        return """
                %s

                Name: %s
                Email: %s
                Role: %s
                Temporary password: %s

                Sign in: %s/select-role

                Change this temporary password after signing in.
                """.formatted(
                intro,
                safeText(fullName),
                email,
                role,
                temporaryPassword,
                trimTrailingSlash(frontendUrl)
        );
    }

    private String buildAccessHtml(String fullName, String email, String temporaryPassword, String role, String intro) {
        String loginUrl = trimTrailingSlash(frontendUrl) + "/select-role";
        return """
                <div style="font-family:Arial,sans-serif;line-height:1.55;color:#122018">
                  <h2 style="margin:0 0 12px;color:#1f704c">OCP SynaptiQ access</h2>
                  <p>%s</p>
                  <table style="border-collapse:collapse;margin:18px 0">
                    <tr><td style="padding:6px 12px 6px 0;color:#607064">Name</td><td style="padding:6px 0;font-weight:700">%s</td></tr>
                    <tr><td style="padding:6px 12px 6px 0;color:#607064">Email</td><td style="padding:6px 0;font-weight:700">%s</td></tr>
                    <tr><td style="padding:6px 12px 6px 0;color:#607064">Role</td><td style="padding:6px 0;font-weight:700">%s</td></tr>
                    <tr><td style="padding:6px 12px 6px 0;color:#607064">Temporary password</td><td style="padding:6px 0;font-weight:700">%s</td></tr>
                  </table>
                  <p><a href="%s" style="display:inline-block;padding:10px 14px;background:#1f704c;color:#fff;text-decoration:none;border-radius:6px;font-weight:700">Open OCP SynaptiQ</a></p>
                  <p style="color:#607064;font-size:13px">Change this temporary password after signing in.</p>
                </div>
                """.formatted(
                escapeHtml(intro),
                escapeHtml(safeText(fullName)),
                escapeHtml(email),
                escapeHtml(role),
                escapeHtml(temporaryPassword),
                escapeHtml(loginUrl)
        );
    }

    private String trimTrailingSlash(String value) {
        if (!hasText(value)) {
            return "http://localhost:5173";
        }
        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }

    private String safeText(String value) {
        return hasText(value) ? value : "OCP SynaptiQ user";
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private String escapeHtml(String value) {
        if (value == null) {
            return "";
        }
        return value
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }
}
