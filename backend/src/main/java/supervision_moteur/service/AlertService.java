package supervision_moteur.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import supervision_moteur.dto.AlertCreateRequest;
import supervision_moteur.dto.AlertLifecycleRequest;
import supervision_moteur.entity.Alerte;
import supervision_moteur.entity.Anomalie;
import supervision_moteur.entity.Machine;
import supervision_moteur.entity.Prediction;
import supervision_moteur.enums.GraviteType;
import supervision_moteur.enums.StatutAlerte;
import supervision_moteur.repository.AlerteRepository;
import supervision_moteur.repository.AnomalieRepository;
import supervision_moteur.repository.MachineRepository;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AlertService {

    private static final List<StatutAlerte> ACTIVE_STATUSES = List.of(
            StatutAlerte.OPEN,
            StatutAlerte.ACKNOWLEDGED,
            StatutAlerte.ASSIGNED,
            StatutAlerte.ESCALATED,
            StatutAlerte.ACTIVE,
            StatutAlerte.LUE
    );

    private final AlerteRepository alerteRepository;
    private final MachineRepository machineRepository;
    private final AnomalieRepository anomalieRepository;

    public Alerte create(AlertCreateRequest request) {
        Alerte alerte = new Alerte();
        alerte.setMachine(resolveMachine(request.getMachineId()));
        alerte.setAnomalie(resolveAnomalie(request.getAnomalieId()));
        alerte.setMessage(request.getMessage() != null ? request.getMessage() : "Operational alert");
        alerte.setGravite(request.getSeverity() != null ? request.getSeverity() : GraviteType.MOYENNE);
        alerte.setStatut(request.getAssignedTechnician() != null ? StatutAlerte.ASSIGNED : StatutAlerte.OPEN);
        alerte.setAssignedTechnician(request.getAssignedTechnician());
        alerte.setDateCreation(LocalDateTime.now());
        alerte.setSlaDeadline(request.getSlaDeadline() != null ? request.getSlaDeadline() : defaultSla(alerte.getGravite()));
        alerte.setEscalationLevel(0);
        alerte.setNotificationChannel(request.getNotificationChannel());
        return alerteRepository.save(alerte);
    }

    public Alerte createFromPrediction(Prediction prediction) {
        if (prediction.getNiveauRisque() == GraviteType.FAIBLE) {
            return null;
        }
        AlertCreateRequest request = new AlertCreateRequest();
        request.setMachineId(prediction.getMachine() != null ? prediction.getMachine().getId() : null);
        request.setSeverity(prediction.getNiveauRisque());
        request.setMessage(buildPredictionMessage(prediction));
        request.setNotificationChannel("dashboard");
        return create(request);
    }

    public Alerte acknowledge(Long id, AlertLifecycleRequest request) {
        Alerte alerte = getRequired(id);
        alerte.setStatut(StatutAlerte.ACKNOWLEDGED);
        alerte.setAcknowledgedBy(request.getUser());
        alerte.setAcknowledgedAt(LocalDateTime.now());
        return alerteRepository.save(alerte);
    }

    public Alerte assign(Long id, AlertLifecycleRequest request) {
        Alerte alerte = getRequired(id);
        alerte.setStatut(StatutAlerte.ASSIGNED);
        alerte.setAssignedTechnician(request.getTechnician());
        if (request.getNotificationChannel() != null) {
            alerte.setNotificationChannel(request.getNotificationChannel());
        }
        return alerteRepository.save(alerte);
    }

    public Alerte resolve(Long id, AlertLifecycleRequest request) {
        Alerte alerte = getRequired(id);
        alerte.setStatut(StatutAlerte.RESOLVED);
        alerte.setResolvedBy(request.getUser());
        alerte.setResolvedAt(LocalDateTime.now());
        alerte.setResolutionNotes(request.getResolutionNotes());
        return alerteRepository.save(alerte);
    }

    public List<Alerte> listActive() {
        return alerteRepository.findByStatutInOrderByDateCreationDesc(ACTIVE_STATUSES);
    }

    public List<Alerte> listHistory() {
        return alerteRepository.findTop50ByOrderByDateCreationDesc();
    }

    public List<Alerte> escalateOverdue() {
        List<Alerte> overdue = alerteRepository.findBySlaDeadlineBeforeAndStatutIn(LocalDateTime.now(), ACTIVE_STATUSES);
        for (Alerte alerte : overdue) {
            alerte.setStatut(StatutAlerte.ESCALATED);
            alerte.setEscalationLevel((alerte.getEscalationLevel() != null ? alerte.getEscalationLevel() : 0) + 1);
        }
        return alerteRepository.saveAll(overdue);
    }

    public long countActive() {
        return alerteRepository.countByStatutIn(ACTIVE_STATUSES);
    }

    private Alerte getRequired(Long id) {
        return alerteRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Alert not found: " + id));
    }

    private Machine resolveMachine(Long machineId) {
        if (machineId == null) {
            return null;
        }
        return machineRepository.findById(machineId)
                .orElseThrow(() -> new IllegalArgumentException("Machine not found: " + machineId));
    }

    private Anomalie resolveAnomalie(Long anomalieId) {
        if (anomalieId == null) {
            return null;
        }
        return anomalieRepository.findById(anomalieId)
                .orElseThrow(() -> new IllegalArgumentException("Anomaly not found: " + anomalieId));
    }

    private LocalDateTime defaultSla(GraviteType gravite) {
        LocalDateTime now = LocalDateTime.now();
        if (gravite == GraviteType.CRITIQUE) {
            return now.plusHours(2);
        }
        if (gravite == GraviteType.ELEVEE) {
            return now.plusHours(8);
        }
        return now.plusDays(1);
    }

    private String buildPredictionMessage(Prediction prediction) {
        String machineName = prediction.getMachine() != null ? prediction.getMachine().getNom() : "unknown motor";
        return "Prediction " + prediction.getOutputLabel() + " on " + machineName
                + " with decision " + prediction.getFinalDecision();
    }
}
