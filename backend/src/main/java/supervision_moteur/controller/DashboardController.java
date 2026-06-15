package supervision_moteur.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import supervision_moteur.dto.AlerteDashboardDto;
import supervision_moteur.dto.AnomalieDashboardDto;
import supervision_moteur.dto.DashboardResponse;
import supervision_moteur.dto.DashboardStatsDto;
import supervision_moteur.dto.MesureDashboardDto;
import supervision_moteur.dto.OperationalDashboardResponse;
import supervision_moteur.dto.PredictionDashboardDto;
import supervision_moteur.entity.Mesure;
import supervision_moteur.enums.GraviteType;
import supervision_moteur.repository.AlerteRepository;
import supervision_moteur.repository.AnomalieRepository;
import supervision_moteur.repository.MesureRepository;
import supervision_moteur.repository.PredictionRepository;
import supervision_moteur.service.AlertService;
import supervision_moteur.service.OperationalDashboardService;

import java.util.List;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final MesureRepository mesureRepository;
    private final AlerteRepository alerteRepository;
    private final AnomalieRepository anomalieRepository;
    private final PredictionRepository predictionRepository;
    private final AlertService alertService;
    private final OperationalDashboardService operationalDashboardService;

    @GetMapping
    @Cacheable(value = "dashboard", key = "'main'")
    public DashboardResponse getDashboardData() {
        Mesure mesure = mesureRepository.findTopByOrderByHorodatageDesc().orElse(null);

        MesureDashboardDto derniereMesure = null;
        if (mesure != null) {
            derniereMesure = new MesureDashboardDto(
                    mesure.getId(),
                    mesure.getMachine().getNom(),
                    mesure.getHorodatage() != null ? mesure.getHorodatage().toString() : null,
                    mesure.getTemperature(),
                    mesure.getCourant(),
                    mesure.getVibration(),
                    mesure.getRpm(),
                    mesure.getStatut() != null ? mesure.getStatut().name() : null,
                    mesure.getEtiquetteAnomalie()
            );
        }

        List<AlerteDashboardDto> alertes = alerteRepository.findTop5ByOrderByDateCreationDesc().stream()
                .map(a -> new AlerteDashboardDto(
                        a.getId(), a.getMessage(),
                        a.getGravite() != null ? a.getGravite().name() : null,
                        a.getStatut() != null ? a.getStatut().name() : null,
                        a.getDateCreation() != null ? a.getDateCreation().toString() : null
                )).toList();

        List<AnomalieDashboardDto> anomalies = anomalieRepository.findTop5ByOrderByDateDetectionDesc().stream()
                .map(a -> new AnomalieDashboardDto(
                        a.getId(), a.getType(), a.getDescription(),
                        a.getGravite() != null ? a.getGravite().name() : null,
                        a.getScore(),
                        a.getDateDetection() != null ? a.getDateDetection().toString() : null
                )).toList();

        List<PredictionDashboardDto> predictions = predictionRepository.findTop5ByOrderByDateCreationDesc().stream()
                .map(p -> new PredictionDashboardDto(
                        p.getId(),
                        p.getStatutPredit() != null ? p.getStatutPredit().name() : null,
                        p.getNiveauRisque() != null ? p.getNiveauRisque().name() : null,
                        p.getConfiance(),
                        p.getDateCreation() != null ? p.getDateCreation().toString() : null
                )).toList();

        return new DashboardResponse(derniereMesure, alertes, anomalies, predictions);
    }

    @GetMapping("/stats")
    @Cacheable(value = "dashboardStats", key = "'stats'")
    public DashboardStatsDto getDashboardStats() {
        return new DashboardStatsDto(
                mesureRepository.count(),
                anomalieRepository.count(),
                alertService.countActive(),
                predictionRepository.countByNiveauRisque(GraviteType.CRITIQUE)
        );
    }

    @GetMapping("/mesures-recentes")
    public List<MesureDashboardDto> getMesuresRecentes() {
        return mesureRepository.findTop20ByOrderByHorodatageDesc().stream()
                .map(m -> new MesureDashboardDto(
                        m.getId(), m.getMachine().getNom(),
                        m.getHorodatage() != null ? m.getHorodatage().toString() : null,
                        m.getTemperature(), m.getCourant(), m.getVibration(), m.getRpm(),
                        m.getStatut() != null ? m.getStatut().name() : null,
                        m.getEtiquetteAnomalie()
                )).toList();
    }

    @GetMapping("/operational-ml")
    @Cacheable(value = "operationalDashboard", key = "#machineId != null ? #machineId : 'all'")
    public OperationalDashboardResponse getOperationalMl(@RequestParam(required = false) Long machineId) {
        return operationalDashboardService.getOperationalData(machineId);
    }
}
