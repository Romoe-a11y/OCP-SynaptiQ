package supervision_moteur.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import supervision_moteur.entity.Alerte;
import supervision_moteur.enums.GraviteType;
import supervision_moteur.enums.StatutAlerte;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface AlerteRepository extends JpaRepository<Alerte, Long> {

    // ── Paginated ──
    Page<Alerte> findAllByOrderByDateCreationDesc(Pageable pageable);
    Page<Alerte> findByStatutInOrderByDateCreationDesc(Collection<StatutAlerte> statuts, Pageable pageable);
    Page<Alerte> findByGraviteOrderByDateCreationDesc(GraviteType gravite, Pageable pageable);
    Page<Alerte> findByMachineIdOrderByDateCreationDesc(Long machineId, Pageable pageable);

    // ── Legacy top-N (dashboard) ──
    List<Alerte> findTop5ByOrderByDateCreationDesc();
    List<Alerte> findTop20ByOrderByDateCreationDesc();
    List<Alerte> findByStatutInOrderByDateCreationDesc(Collection<StatutAlerte> statuts);
    List<Alerte> findTop50ByOrderByDateCreationDesc();
    Optional<Alerte> findByAnomalieId(Long anomalieId);

    // ── SLA / escalation ──
    List<Alerte> findBySlaDeadlineBeforeAndStatutIn(LocalDateTime deadline, Collection<StatutAlerte> statuts);

    // ── Counts ──
    @Query(value = "SELECT COUNT(*) FROM alertes WHERE statut::text = :statut", nativeQuery = true)
    long countByStatutNative(@Param("statut") String statut);

    long countByStatutIn(Collection<StatutAlerte> statuts);
    long countByGravite(GraviteType gravite);
    long countByMachineId(Long machineId);
}
