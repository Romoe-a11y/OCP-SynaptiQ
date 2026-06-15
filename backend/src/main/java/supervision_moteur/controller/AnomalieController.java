package supervision_moteur.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import supervision_moteur.entity.Anomalie;
import supervision_moteur.repository.AnomalieRepository;

import java.util.List;
@RestController
@RequestMapping("/api/anomalies")
@RequiredArgsConstructor
public class AnomalieController {

    private final AnomalieRepository anomalieRepository;

    @GetMapping
    public List<Anomalie> getAllAnomalies() {
        return anomalieRepository.findTop20ByOrderByDateDetectionDesc();
    }
}