package supervision_moteur.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import supervision_moteur.dto.FailureHistoryRequest;
import supervision_moteur.entity.FailureHistory;
import supervision_moteur.service.FailureHistoryService;

import java.util.List;

@RestController
@RequestMapping("/api/failure-history")
@RequiredArgsConstructor
public class FailureHistoryController {

    private final FailureHistoryService failureHistoryService;

    @PostMapping
    public FailureHistory create(@RequestBody FailureHistoryRequest request) {
        try {
            return failureHistoryService.create(request);
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, ex.getMessage(), ex);
        }
    }

    @GetMapping
    public List<FailureHistory> list(@RequestParam(required = false) Long machineId) {
        return failureHistoryService.list(machineId);
    }
}
