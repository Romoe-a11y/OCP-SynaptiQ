package supervision_moteur.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import supervision_moteur.entity.Anomalie;

import java.util.List;
import java.util.Optional;

public interface AnomalieRepository extends JpaRepository<Anomalie, Long> {
    List<Anomalie> findTop5ByOrderByDateDetectionDesc();
    List<Anomalie> findTop20ByOrderByDateDetectionDesc();
    Optional<Anomalie> findByMesureId(Long mesureId);
}
