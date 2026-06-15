package supervision_moteur.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import supervision_moteur.entity.ModelRegistryEntry;
import supervision_moteur.service.ModelRegistryService;

import java.util.List;

@RestController
@RequestMapping("/api/model-registry")
@RequiredArgsConstructor
public class ModelRegistryController {

    private final ModelRegistryService modelRegistryService;

    @GetMapping
    public List<ModelRegistryEntry> list() {
        return modelRegistryService.list();
    }

    @PostMapping
    public ModelRegistryEntry register(@RequestBody ModelRegistryEntry entry) {
        return modelRegistryService.register(entry);
    }

    @GetMapping("/production/{modelName}")
    public ModelRegistryEntry production(@PathVariable String modelName) {
        return modelRegistryService.currentProduction(modelName);
    }
}
