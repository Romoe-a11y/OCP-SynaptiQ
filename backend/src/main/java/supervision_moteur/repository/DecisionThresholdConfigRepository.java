package supervision_moteur.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import supervision_moteur.entity.DecisionThresholdConfig;

import java.util.Optional;

public interface DecisionThresholdConfigRepository extends JpaRepository<DecisionThresholdConfig, Long> {
    Optional<DecisionThresholdConfig> findTopByOrderByUpdatedAtDesc();
}
