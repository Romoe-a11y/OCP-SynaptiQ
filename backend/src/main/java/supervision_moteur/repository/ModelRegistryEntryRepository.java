package supervision_moteur.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import supervision_moteur.entity.ModelRegistryEntry;

import java.util.List;
import java.util.Optional;

public interface ModelRegistryEntryRepository extends JpaRepository<ModelRegistryEntry, Long> {
    List<ModelRegistryEntry> findTop20ByOrderByTrainingDateDesc();
    Optional<ModelRegistryEntry> findTopByModelNameAndStatusOrderByTrainingDateDesc(String modelName, String status);
}
