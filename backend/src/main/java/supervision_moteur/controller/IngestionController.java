package supervision_moteur.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import supervision_moteur.dto.BatchIngestionRequest;
import supervision_moteur.service.LiveIngestionService;

import java.util.Map;

@RestController
@RequestMapping("/api/ingestion")
@RequiredArgsConstructor
public class IngestionController {

    private final LiveIngestionService liveIngestionService;

    @PostMapping("/measurements")
    public Map<String, Object> ingestMeasurements(@RequestBody BatchIngestionRequest request) {
        try {
            return liveIngestionService.ingest(request);
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, ex.getMessage(), ex);
        }
    }
}
