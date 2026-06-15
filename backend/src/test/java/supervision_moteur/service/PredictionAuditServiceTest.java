package supervision_moteur.service;

import org.junit.jupiter.api.Test;
import supervision_moteur.dto.AiPredictionResponse;
import supervision_moteur.entity.DecisionThresholdConfig;
import supervision_moteur.entity.Machine;
import supervision_moteur.entity.Mesure;
import supervision_moteur.entity.Prediction;
import supervision_moteur.enums.GraviteType;
import supervision_moteur.enums.StatutMachine;
import supervision_moteur.repository.PredictionRepository;

import java.time.LocalDateTime;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class PredictionAuditServiceTest {

    @Test
    void persistsPredictionAuditFields() {
        PredictionRepository repository = mock(PredictionRepository.class);
        DecisionThresholdService thresholdService = mock(DecisionThresholdService.class);
        when(repository.save(any(Prediction.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(thresholdService.getCurrent()).thenReturn(thresholds());

        PredictionAuditService service = new PredictionAuditService(repository, thresholdService);
        Prediction prediction = service.persist(measure(), response());

        assertEquals("critical", prediction.getOutputLabel());
        assertEquals(GraviteType.CRITIQUE, prediction.getNiveauRisque());
        assertEquals(StatutMachine.CRITIQUE, prediction.getStatutPredit());
        assertEquals("diagnostic_model", prediction.getModelName());
        assertNotNull(prediction.getInputFeaturesJson());
        assertNotNull(prediction.getRawOutputJson());
    }

    private DecisionThresholdConfig thresholds() {
        DecisionThresholdConfig config = new DecisionThresholdConfig();
        config.setWarningThreshold(0.45);
        config.setUrgentThreshold(0.70);
        config.setStopThreshold(0.85);
        return config;
    }

    private Mesure measure() {
        Machine machine = new Machine();
        machine.setId(1L);
        machine.setNom("Motor A");
        machine.setStatut(StatutMachine.NORMAL);

        Mesure mesure = new Mesure();
        mesure.setId(10L);
        mesure.setMachine(machine);
        mesure.setHorodatage(LocalDateTime.now());
        mesure.setTemperature(92.0);
        mesure.setCourant(35.0);
        mesure.setVibration(1.4);
        mesure.setRpm(1420.0);
        mesure.setStatut(StatutMachine.ALERTE);
        return mesure;
    }

    private AiPredictionResponse response() {
        AiPredictionResponse response = new AiPredictionResponse();
        response.setDiagnostic_label("critical");
        response.setDecision("ARRET_RECOMMANDE");
        response.setProbability(0.91);
        response.setAnomaly_score(88.0);
        response.setModel_name("diagnostic_model");
        response.setModel_version("5");
        response.setExplanation("High vibration and temperature drove the alert.");
        response.setInput_data(Map.of("temperature", 92.0, "vibration", 1.4));
        return response;
    }
}
