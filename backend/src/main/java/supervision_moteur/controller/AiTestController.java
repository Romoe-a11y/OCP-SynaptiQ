package supervision_moteur.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import supervision_moteur.dto.AiPredictionRequest;
import supervision_moteur.dto.AiPredictionResponse;
import supervision_moteur.service.AiPredictionService;

@RestController
@RequestMapping("/api/ia")
@RequiredArgsConstructor
public class AiTestController {

    private final AiPredictionService aiPredictionService;

    @PostMapping("/predict")
    public AiPredictionResponse predict(@RequestBody AiPredictionRequest request) {
        return aiPredictionService.predict(request);
    }

    @GetMapping("/test")
    public String test() {
        return "Connexion Spring Boot -> Flask IA OK";
    }

    @GetMapping("/diagnostic/derniere-mesure")
    public AiPredictionResponse predictDerniereMesure() {
        return aiPredictionService.predictDerniereMesure();
    }
}