package supervision_moteur.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import supervision_moteur.dto.DecisionThresholdRequest;
import supervision_moteur.entity.DecisionThresholdConfig;
import supervision_moteur.service.DecisionThresholdService;

@RestController
@RequestMapping("/api/decision-thresholds")
@RequiredArgsConstructor
public class DecisionThresholdController {

    private final DecisionThresholdService thresholdService;

    @GetMapping
    public DecisionThresholdConfig getCurrent() {
        return thresholdService.getCurrent();
    }

    @PostMapping
    public DecisionThresholdConfig save(@RequestBody DecisionThresholdRequest request) {
        return thresholdService.save(request);
    }
}
