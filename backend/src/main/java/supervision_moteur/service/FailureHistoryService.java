package supervision_moteur.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import supervision_moteur.dto.FailureHistoryRequest;
import supervision_moteur.entity.FailureHistory;
import supervision_moteur.entity.Machine;
import supervision_moteur.enums.GraviteType;
import supervision_moteur.repository.FailureHistoryRepository;
import supervision_moteur.repository.MachineRepository;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class FailureHistoryService {

    private final FailureHistoryRepository failureHistoryRepository;
    private final MachineRepository machineRepository;

    public FailureHistory create(FailureHistoryRequest request) {
        Machine machine = machineRepository.findById(request.getMachineId())
                .orElseThrow(() -> new IllegalArgumentException("Machine not found: " + request.getMachineId()));

        FailureHistory history = new FailureHistory();
        history.setMachine(machine);
        history.setFailureDate(request.getFailureDate() != null ? request.getFailureDate() : LocalDateTime.now());
        history.setReplacedComponent(request.getReplacedComponent());
        history.setTechnicianDiagnosis(request.getTechnicianDiagnosis());
        history.setDowntimeDurationMinutes(request.getDowntimeDurationMinutes());
        history.setRepairAction(request.getRepairAction());
        history.setActualRootCause(request.getActualRootCause());
        history.setSeverity(request.getSeverity() != null ? request.getSeverity() : GraviteType.MOYENNE);
        history.setNotes(request.getNotes());
        history.setCreatedAt(LocalDateTime.now());
        return failureHistoryRepository.save(history);
    }

    public List<FailureHistory> list(Long machineId) {
        if (machineId != null) {
            return failureHistoryRepository.findByMachineIdOrderByFailureDateDesc(machineId);
        }
        return failureHistoryRepository.findTop50ByOrderByFailureDateDesc();
    }
}
