package supervision_moteur.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import supervision_moteur.entity.FailureHistory;

import java.util.List;

public interface FailureHistoryRepository extends JpaRepository<FailureHistory, Long> {
    List<FailureHistory> findByMachineIdOrderByFailureDateDesc(Long machineId);
    List<FailureHistory> findTop50ByOrderByFailureDateDesc();
}
