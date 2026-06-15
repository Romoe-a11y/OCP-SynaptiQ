package supervision_moteur.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import supervision_moteur.entity.DriftCheck;

import java.util.List;
import java.util.Optional;

public interface DriftCheckRepository extends JpaRepository<DriftCheck, Long> {
    Optional<DriftCheck> findTopByOrderByCheckedAtDesc();
    List<DriftCheck> findTop30ByOrderByCheckedAtDesc();
    List<DriftCheck> findTop30ByMachineIdOrderByCheckedAtDesc(Long machineId);
}
