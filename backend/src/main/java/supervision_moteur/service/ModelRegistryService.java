package supervision_moteur.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import supervision_moteur.entity.ModelRegistryEntry;
import supervision_moteur.repository.ModelRegistryEntryRepository;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ModelRegistryService {

    private final ModelRegistryEntryRepository repository;

    public List<ModelRegistryEntry> list() {
        return repository.findTop20ByOrderByTrainingDateDesc();
    }

    public ModelRegistryEntry register(ModelRegistryEntry entry) {
        if (entry.getTrainingDate() == null) {
            entry.setTrainingDate(LocalDateTime.now());
        }
        if (entry.getStatus() == null || entry.getStatus().isBlank()) {
            entry.setStatus("development");
        }
        return repository.save(entry);
    }

    public ModelRegistryEntry currentProduction(String modelName) {
        return repository.findTopByModelNameAndStatusOrderByTrainingDateDesc(modelName, "production")
                .orElseGet(() -> {
                    ModelRegistryEntry fallback = new ModelRegistryEntry();
                    fallback.setModelName(modelName);
                    fallback.setVersion("unknown");
                    fallback.setArtifactPath("ai/models/diagnostic_model.pkl");
                    fallback.setTrainingDate(LocalDateTime.now());
                    fallback.setStatus("development");
                    fallback.setMetricsJson("{\"note\":\"No registry row found; using local artifact fallback.\"}");
                    return fallback;
                });
    }
}
