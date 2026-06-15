package supervision_moteur.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import supervision_moteur.entity.Mesure;
import supervision_moteur.repository.MesureRepository;

import java.util.List;

@RestController
@RequestMapping("/api/mesures")
@RequiredArgsConstructor
public class MesureController {

    private final MesureRepository mesureRepository;

    @GetMapping
    public List<Mesure> getAllMesures() {
        return mesureRepository.findTop50ByOrderByHorodatageDesc();
    }

    @GetMapping("/recentes")
    public List<Mesure> getRecentMesures() {
        return mesureRepository.findTop50ByOrderByHorodatageDesc();
    }

    @GetMapping("/derniere")
    public Mesure getDerniereMesure(@RequestParam(required = false) Long machineId) {
        if (machineId != null) {
            return mesureRepository.findTopByMachineIdOrderByHorodatageDesc(machineId).orElse(null);
        }
        return mesureRepository.findTopByOrderByHorodatageDesc().orElse(null);
    }
}