package supervision_moteur.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Async;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import supervision_moteur.entity.AuditLog;
import supervision_moteur.repository.AuditLogRepository;

import java.time.LocalDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuditService {

    private final AuditLogRepository auditLogRepository;
    private final ObjectMapper objectMapper;

    @Async
    public void logAction(String entityType, Long entityId, String action, Object oldValue, Object newValue, String details) {
        try {
            AuditLog entry = AuditLog.builder()
                    .entityType(entityType)
                    .entityId(entityId)
                    .action(action)
                    .performedBy(getCurrentUser())
                    .performedAt(LocalDateTime.now())
                    .oldValueJson(serialize(oldValue))
                    .newValueJson(serialize(newValue))
                    .details(details)
                    .build();
            auditLogRepository.save(entry);
        } catch (Exception ex) {
            log.warn("Failed to save audit log: {}", ex.getMessage());
        }
    }

    @Async
    public void logAction(String entityType, Long entityId, String action, String details) {
        logAction(entityType, entityId, action, null, null, details);
    }

    @Async
    public void logLogin(String email, boolean success, HttpServletRequest request) {
        try {
            AuditLog entry = AuditLog.builder()
                    .entityType("AUTH")
                    .action(success ? "LOGIN_SUCCESS" : "LOGIN_FAILED")
                    .performedBy(email)
                    .performedAt(LocalDateTime.now())
                    .ipAddress(getClientIp(request))
                    .userAgent(request.getHeader("User-Agent"))
                    .details(success ? "Successful login" : "Failed login attempt")
                    .build();
            auditLogRepository.save(entry);
        } catch (Exception ex) {
            log.warn("Failed to save login audit: {}", ex.getMessage());
        }
    }

    public Page<AuditLog> getAuditHistory(Pageable pageable) {
        return auditLogRepository.findAllByOrderByPerformedAtDesc(pageable);
    }

    public Page<AuditLog> getAuditHistoryByEntity(String entityType, Pageable pageable) {
        return auditLogRepository.findByEntityTypeOrderByPerformedAtDesc(entityType, pageable);
    }

    public Page<AuditLog> getAuditHistoryByEntityAndId(String entityType, Long entityId, Pageable pageable) {
        return auditLogRepository.findByEntityTypeAndEntityIdOrderByPerformedAtDesc(entityType, entityId, pageable);
    }

    private String getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated()) {
            return auth.getName();
        }
        return "system";
    }

    private String getClientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    private String serialize(Object value) {
        if (value == null) return null;
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException e) {
            return value.toString();
        }
    }
}
