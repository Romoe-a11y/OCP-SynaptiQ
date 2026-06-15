package supervision_moteur.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import supervision_moteur.entity.Mesure;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface MesureRepository extends JpaRepository<Mesure, Long> {

    // ── Paginated queries ──
    Page<Mesure> findByMachineIdOrderByHorodatageDesc(Long machineId, Pageable pageable);
    Page<Mesure> findAllByOrderByHorodatageDesc(Pageable pageable);
    Page<Mesure> findByHorodatageBetweenOrderByHorodatageDesc(LocalDateTime from, LocalDateTime to, Pageable pageable);

    // ── Legacy top-N queries (dashboard compatibility) ──
    List<Mesure> findByMachineId(Long machineId);
    List<Mesure> findTop100ByMachineIdOrderByHorodatageDesc(Long machineId);
    List<Mesure> findTop100ByOrderByHorodatageDesc();
    Optional<Mesure> findTopByOrderByHorodatageDesc();
    Optional<Mesure> findTopByMachineIdOrderByHorodatageDesc(Long machineId);
    List<Mesure> findTop20ByOrderByHorodatageDesc();
    List<Mesure> findTop50ByOrderByHorodatageDesc();

    long countByMachineId(Long machineId);
}
