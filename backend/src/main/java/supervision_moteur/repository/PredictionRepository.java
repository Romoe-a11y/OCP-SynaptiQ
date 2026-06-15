package supervision_moteur.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import supervision_moteur.entity.Prediction;
import supervision_moteur.enums.GraviteType;

import java.util.List;

public interface PredictionRepository extends JpaRepository<Prediction, Long> {

    // ── Paginated ──
    Page<Prediction> findByMachineIdOrderByDateCreationDesc(Long machineId, Pageable pageable);
    Page<Prediction> findAllByOrderByDateCreationDesc(Pageable pageable);
    Page<Prediction> findByNiveauRisqueOrderByDateCreationDesc(GraviteType niveauRisque, Pageable pageable);

    // ── Legacy top-N (dashboard) ──
    List<Prediction> findTop5ByOrderByDateCreationDesc();
    List<Prediction> findTop20ByOrderByDateCreationDesc();
    List<Prediction> findTop50ByOrderByDateCreationDesc();
    List<Prediction> findTop20ByMachineIdOrderByDateCreationDesc(Long machineId);

    // ── Counts ──
    @Query(value = "SELECT COUNT(*) FROM predictions WHERE niveau_risque::text = :niveauRisque", nativeQuery = true)
    long countByNiveauRisqueNative(@Param("niveauRisque") String niveauRisque);

    long countByNiveauRisque(GraviteType niveauRisque);
    long countByMachineId(Long machineId);
}
