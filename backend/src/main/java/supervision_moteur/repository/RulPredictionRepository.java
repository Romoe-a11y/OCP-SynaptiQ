package supervision_moteur.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import supervision_moteur.entity.RulPrediction;

import java.util.List;
import java.util.Optional;

public interface RulPredictionRepository extends JpaRepository<RulPrediction, Long> {
    Optional<RulPrediction> findTopByMachineIdOrderByPredictedAtDesc(Long machineId);
    List<RulPrediction> findTop20ByMachineIdOrderByPredictedAtDesc(Long machineId);
    List<RulPrediction> findTop20ByOrderByPredictedAtDesc();
}
