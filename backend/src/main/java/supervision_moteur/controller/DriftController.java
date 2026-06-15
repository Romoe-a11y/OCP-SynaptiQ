package supervision_moteur.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import supervision_moteur.entity.DriftCheck;
import supervision_moteur.service.DriftMonitoringService;

import java.util.List;

@RestController
@RequestMapping("/api/drift")
@RequiredArgsConstructor
public class DriftController {

    private final DriftMonitoringService driftMonitoringService;

    @GetMapping
    public List<DriftCheck> history(@RequestParam(required = false) Long machineId) {
        return driftMonitoringService.history(machineId);
    }

    @PostMapping("/run")
    public List<DriftCheck> runNow() {
        return driftMonitoringService.runChecks();
    }
}
