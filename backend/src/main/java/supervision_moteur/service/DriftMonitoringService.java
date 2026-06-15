package supervision_moteur.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import supervision_moteur.dto.AlertCreateRequest;
import supervision_moteur.entity.DriftCheck;
import supervision_moteur.entity.Machine;
import supervision_moteur.entity.Mesure;
import supervision_moteur.enums.GraviteType;
import supervision_moteur.repository.DriftCheckRepository;
import supervision_moteur.repository.MachineRepository;
import supervision_moteur.repository.MesureRepository;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class DriftMonitoringService {

    private final DriftCheckRepository driftCheckRepository;
    private final MesureRepository mesureRepository;
    private final MachineRepository machineRepository;
    private final AlertService alertService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Scheduled(cron = "${drift.monitoring.cron:0 0 2 * * *}")
    public void scheduledDailyCheck() {
        runChecks();
    }

    public List<DriftCheck> runChecks() {
        DriftCheck global = evaluate("GLOBAL", null, mesureRepository.findTop100ByOrderByHorodatageDesc());

        for (Machine machine : machineRepository.findAll()) {
            evaluate("MACHINE", machine, mesureRepository.findTop100ByMachineIdOrderByHorodatageDesc(machine.getId()));
        }

        return driftCheckRepository.findTop30ByOrderByCheckedAtDesc();
    }

    public List<DriftCheck> history(Long machineId) {
        if (machineId != null) {
            return driftCheckRepository.findTop30ByMachineIdOrderByCheckedAtDesc(machineId);
        }
        return driftCheckRepository.findTop30ByOrderByCheckedAtDesc();
    }

    private DriftCheck evaluate(String scope, Machine machine, List<Mesure> recentDesc) {
        DriftCheck check = new DriftCheck();
        check.setScope(scope);
        check.setMachine(machine);
        check.setCheckedAt(LocalDateTime.now());

        if (recentDesc.size() < 12) {
            check.setStatus("OK");
            check.setPsiScore(0.0);
            check.setDetailsJson("{\"message\":\"Not enough data for drift comparison\"}");
            return driftCheckRepository.save(check);
        }

        List<Mesure> ordered = new ArrayList<>(recentDesc);
        Collections.reverse(ordered);
        int midpoint = ordered.size() / 2;
        List<Mesure> reference = ordered.subList(0, midpoint);
        List<Mesure> current = ordered.subList(midpoint, ordered.size());

        Map<String, Double> scores = new LinkedHashMap<>();
        scores.put("temperature", normalizedMeanShift(reference.stream().map(Mesure::getTemperature).toList(), current.stream().map(Mesure::getTemperature).toList()));
        scores.put("courant", normalizedMeanShift(reference.stream().map(Mesure::getCourant).toList(), current.stream().map(Mesure::getCourant).toList()));
        scores.put("vibration", normalizedMeanShift(reference.stream().map(Mesure::getVibration).toList(), current.stream().map(Mesure::getVibration).toList()));
        scores.put("rpm", normalizedMeanShift(reference.stream().map(Mesure::getRpm).toList(), current.stream().map(Mesure::getRpm).toList()));

        double maxScore = scores.values().stream().mapToDouble(Double::doubleValue).max().orElse(0.0);
        String status = maxScore >= 1.0 ? "DRIFT" : maxScore >= 0.5 ? "WATCH" : "OK";

        check.setStatus(status);
        check.setPsiScore(Math.round(maxScore * 10000.0) / 10000.0);
        check.setDetailsJson(toJson(Map.of(
                "method", "normalized_mean_shift",
                "features", scores,
                "reference_rows", reference.size(),
                "current_rows", current.size()
        )));
        DriftCheck saved = driftCheckRepository.save(check);

        if (!"OK".equals(status)) {
            AlertCreateRequest alert = new AlertCreateRequest();
            alert.setMachineId(machine != null ? machine.getId() : null);
            alert.setSeverity("DRIFT".equals(status) ? GraviteType.ELEVEE : GraviteType.MOYENNE);
            alert.setMessage(scope + " drift status " + status + " detected. Max score=" + saved.getPsiScore());
            alert.setNotificationChannel("dashboard");
            alertService.create(alert);
        }

        return saved;
    }

    private double normalizedMeanShift(List<Double> reference, List<Double> current) {
        double refMean = mean(reference);
        double curMean = mean(current);
        double refStd = Math.max(std(reference, refMean), 1.0);
        return Math.abs(curMean - refMean) / refStd;
    }

    private double mean(List<Double> values) {
        List<Double> valid = values.stream().filter(v -> v != null && Double.isFinite(v)).toList();
        if (valid.isEmpty()) {
            return 0.0;
        }
        return valid.stream().mapToDouble(Double::doubleValue).average().orElse(0.0);
    }

    private double std(List<Double> values, double mean) {
        List<Double> valid = values.stream().filter(v -> v != null && Double.isFinite(v)).toList();
        if (valid.size() < 2) {
            return 0.0;
        }
        double variance = valid.stream()
                .mapToDouble(v -> Math.pow(v - mean, 2.0))
                .sum() / valid.size();
        return Math.sqrt(variance);
    }

    private String toJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException ex) {
            return "{}";
        }
    }
}
