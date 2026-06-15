package supervision_moteur.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import supervision_moteur.dto.AlertCreateRequest;
import supervision_moteur.dto.AlertLifecycleRequest;
import supervision_moteur.entity.Alerte;
import supervision_moteur.repository.AlerteRepository;
import supervision_moteur.service.AlertService;

import java.util.List;

@RestController
@RequestMapping("/api/alertes")
@RequiredArgsConstructor
public class AlerteController {

    private final AlerteRepository alerteRepository;
    private final AlertService alertService;

    @GetMapping
    public List<Alerte> getAllAlertes() {
        return alerteRepository.findTop20ByOrderByDateCreationDesc();
    }

    @PostMapping
    public Alerte createAlert(@RequestBody AlertCreateRequest request) {
        try {
            return alertService.create(request);
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, ex.getMessage(), ex);
        }
    }

    @GetMapping("/active")
    public List<Alerte> getActiveAlerts() {
        return alertService.listActive();
    }

    @GetMapping("/history")
    public List<Alerte> getAlertHistory() {
        return alertService.listHistory();
    }

    @PostMapping("/{id}/acknowledge")
    public Alerte acknowledge(@PathVariable Long id, @RequestBody AlertLifecycleRequest request) {
        return updateLifecycle(() -> alertService.acknowledge(id, request));
    }

    @PostMapping("/{id}/assign")
    public Alerte assign(@PathVariable Long id, @RequestBody AlertLifecycleRequest request) {
        return updateLifecycle(() -> alertService.assign(id, request));
    }

    @PostMapping("/{id}/resolve")
    public Alerte resolve(@PathVariable Long id, @RequestBody AlertLifecycleRequest request) {
        return updateLifecycle(() -> alertService.resolve(id, request));
    }

    @PostMapping("/escalate-overdue")
    public List<Alerte> escalateOverdue() {
        return alertService.escalateOverdue();
    }

    private Alerte updateLifecycle(AlertOperation operation) {
        try {
            return operation.run();
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, ex.getMessage(), ex);
        }
    }

    private interface AlertOperation {
        Alerte run();
    }
}
