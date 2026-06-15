package supervision_moteur.controller;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import supervision_moteur.dto.AiPredictionResponse;
import supervision_moteur.dto.RulPredictionResponse;
import supervision_moteur.entity.Mesure;
import supervision_moteur.entity.Prediction;
import supervision_moteur.entity.RulPrediction;
import supervision_moteur.repository.MesureRepository;
import supervision_moteur.repository.PredictionRepository;
import supervision_moteur.service.AiPredictionService;
import supervision_moteur.service.AlertService;
import supervision_moteur.service.PredictionAuditService;
import supervision_moteur.service.RulPredictionService;

import java.util.List;

@RestController
@RequestMapping("/api/predictions")
@RequiredArgsConstructor
public class PredictionController {

    private final PredictionRepository predictionRepository;
    private final MesureRepository mesureRepository;
    private final AiPredictionService aiPredictionService;
    private final PredictionAuditService predictionAuditService;
    private final AlertService alertService;
    private final RulPredictionService rulPredictionService;

    @GetMapping
    public List<Prediction> getAllPredictions() {
        return predictionRepository.findTop20ByOrderByDateCreationDesc();
    }

    @PostMapping("/run/{mesureId}")
    public Prediction runPrediction(@PathVariable Long mesureId) {
        Mesure mesure = mesureRepository.findById(mesureId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Measurement not found"));
        AiPredictionResponse response = aiPredictionService.predict(aiPredictionService.requestFromMesure(mesure));
        Prediction prediction = predictionAuditService.persist(mesure, response);
        alertService.createFromPrediction(prediction);
        return prediction;
    }

    @PostMapping("/predict-rul/{machineId}")
    public RulPredictionResponse predictRul(@PathVariable Long machineId) {
        try {
            return rulPredictionService.toResponse(rulPredictionService.predictForMachine(machineId));
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, ex.getMessage(), ex);
        }
    }

    @GetMapping("/rul/{machineId}")
    public List<RulPredictionResponse> getRulTrend(@PathVariable Long machineId) {
        return rulPredictionService.trend(machineId).stream()
                .map(rulPredictionService::toResponse)
                .toList();
    }

    @GetMapping("/rul")
    public List<RulPredictionResponse> getGlobalRulTrend() {
        return rulPredictionService.trend(null).stream()
                .map(rulPredictionService::toResponse)
                .toList();
    }
}
