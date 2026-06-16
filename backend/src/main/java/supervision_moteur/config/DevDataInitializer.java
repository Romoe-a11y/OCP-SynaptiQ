package supervision_moteur.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import supervision_moteur.entity.Alerte;
import supervision_moteur.entity.Anomalie;
import supervision_moteur.entity.DecisionThresholdConfig;
import supervision_moteur.entity.DriftCheck;
import supervision_moteur.entity.Machine;
import supervision_moteur.entity.Mesure;
import supervision_moteur.entity.ModelRegistryEntry;
import supervision_moteur.entity.Prediction;
import supervision_moteur.entity.RulPrediction;
import supervision_moteur.entity.Utilisateur;
import supervision_moteur.enums.GraviteType;
import supervision_moteur.enums.RoleUtilisateur;
import supervision_moteur.enums.StatutAlerte;
import supervision_moteur.enums.StatutMachine;
import supervision_moteur.repository.AlerteRepository;
import supervision_moteur.repository.AnomalieRepository;
import supervision_moteur.repository.DecisionThresholdConfigRepository;
import supervision_moteur.repository.DriftCheckRepository;
import supervision_moteur.repository.MachineRepository;
import supervision_moteur.repository.MesureRepository;
import supervision_moteur.repository.ModelRegistryEntryRepository;
import supervision_moteur.repository.PredictionRepository;
import supervision_moteur.repository.RulPredictionRepository;
import supervision_moteur.repository.UtilisateurRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;

@Slf4j
@Component
@Profile("dev")
@RequiredArgsConstructor
public class DevDataInitializer implements ApplicationRunner {

    private final JdbcTemplate jdbcTemplate;
    private final DecisionThresholdConfigRepository decisionThresholdConfigRepository;
    private final UtilisateurRepository utilisateurRepository;
    private final MachineRepository machineRepository;
    private final MesureRepository mesureRepository;
    private final PredictionRepository predictionRepository;
    private final AnomalieRepository anomalieRepository;
    private final AlerteRepository alerteRepository;
    private final RulPredictionRepository rulPredictionRepository;
    private final DriftCheckRepository driftCheckRepository;
    private final ModelRegistryEntryRepository modelRegistryEntryRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.dev-data.enabled:true}")
    private boolean enabled;

    @Override
    public void run(ApplicationArguments args) {
        if (!enabled) {
            return;
        }

        ensureProfilePictureStorage();
        seedMachines();
        seedDecisionThresholds();
        seedAdmin();
        seedOperator();
        seedOperationalDashboardData();
        seedModelRegistry();
    }

    private void ensureProfilePictureStorage() {
        try {
            jdbcTemplate.execute("ALTER TABLE utilisateurs ALTER COLUMN profile_picture_url CHARACTER LARGE OBJECT");
        } catch (Exception ex) {
            log.debug("Profile picture storage already compatible or table not ready: {}", ex.getMessage());
        }
    }

    private void seedMachines() {
        List<MachineSeed> machines = List.of(
                new MachineSeed(1L, "Broyeur Primaire BK-01", "Ball Mill - 2400 kW ABB AXR 500", "Usine de Traitement Khouribga - Ligne 1", 80.0, 35.0, 1.2, 4500.0),
                new MachineSeed(102L, "Convoyeur Principal CV-200", "Belt Conveyor - 200 kW Siemens 1LA8", "Mine Sidi Chennane - Axe Transport", 65.0, 22.0, 0.8, 1600.0),
                new MachineSeed(103L, "Pompe Slurry SP-045", "Slurry Pump - 800 kW Warman AH", "Pipeline Khouribga-Jorf Lasfar - Station 3", 85.0, 48.0, 1.0, 1000.0),
                new MachineSeed(104L, "Ventilateur Exhaure VE-12", "Axial Fan - 150 kW Howden", "Mine Merah Lahrach - Galerie Sud", 60.0, 18.0, 0.6, 3200.0),
                new MachineSeed(105L, "Compresseur Atlas AC-380", "Screw Compressor - 350 kW Atlas Copco GA 355", "Usine de Sechage - Unite 2", 95.0, 36.0, 0.9, 1600.0),
                new MachineSeed(106L, "Concasseur Giratoire CG-07", "Gyratory Crusher - 500 kW Metso MP800", "Carriere Beni Amir - Zone d'Extraction", 90.0, 55.0, 1.8, 700.0)
        );

        for (MachineSeed seed : machines) {
            jdbcTemplate.update("""
                            MERGE INTO machines (id, nom, type, emplacement, statut, date_creation)
                            KEY(id)
                            VALUES (?, ?, ?, ?, 'NORMAL', COALESCE((SELECT date_creation FROM machines WHERE id = ?), CURRENT_TIMESTAMP))
                            """,
                    seed.id(), seed.name(), seed.type(), seed.location(), seed.id());
            jdbcTemplate.update("""
                            MERGE INTO configuration_seuils (
                                machine_id,
                                temperature_max,
                                courant_max,
                                vibration_max,
                                rpm_max,
                                date_mise_a_jour
                            )
                            KEY(machine_id)
                            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                            """,
                    seed.id(), seed.temperatureMax(), seed.courantMax(), seed.vibrationMax(), seed.rpmMax());
        }
    }

    private void seedDecisionThresholds() {
        if (decisionThresholdConfigRepository.count() > 0) {
            return;
        }

        DecisionThresholdConfig config = new DecisionThresholdConfig();
        config.setWarningThreshold(0.45);
        config.setUrgentThreshold(0.70);
        config.setStopThreshold(0.85);
        config.setTuningGoal("BALANCED");
        config.setNotes("Default local development thresholds.");
        config.setUpdatedAt(LocalDateTime.now());
        decisionThresholdConfigRepository.save(config);
    }

    private void seedAdmin() {
        Utilisateur admin = utilisateurRepository.findByEmailIgnoreCase("admin@gmail.com")
                .orElseGet(Utilisateur::new);
        admin.setNomComplet("Administrateur");
        admin.setEmail("admin@gmail.com");
        admin.setMotDePasse(passwordEncoder.encode("admin123"));
        admin.setRole(RoleUtilisateur.ADMIN);
        if (admin.getDateCreation() == null) {
            admin.setDateCreation(LocalDateTime.now());
        }
        admin.setAccountLocked(false);
        admin.setFailedAttempts(0);
        admin.setNotificationEmail(true);
        utilisateurRepository.save(admin);
        log.info("Dev data ready. Login with admin@gmail.com / admin123");
    }

    private void seedOperator() {
        Utilisateur operator = utilisateurRepository.findByEmailIgnoreCase("talbanimohammed.lifeuse@gmail.com")
                .orElseGet(Utilisateur::new);
        operator.setNomComplet("Talbani Mohammed");
        operator.setEmail("talbanimohammed.lifeuse@gmail.com");
        operator.setMotDePasse(passwordEncoder.encode("operator123"));
        operator.setRole(RoleUtilisateur.UTILISATEUR);
        if (operator.getDateCreation() == null) {
            operator.setDateCreation(LocalDateTime.now());
        }
        operator.setAccountLocked(false);
        operator.setFailedAttempts(0);
        operator.setNotificationEmail(false);
        utilisateurRepository.save(operator);
        log.info("Dev operator ready. Login with talbanimohammed.lifeuse@gmail.com / operator123");
    }

    private void seedOperationalDashboardData() {
        if (mesureRepository.count() > 0) {
            return;
        }

        LocalDateTime now = LocalDateTime.now();
        List<MachineScenario> scenarios = List.of(
                new MachineScenario(106L, StatutMachine.CRITIQUE, GraviteType.CRITIQUE, 75.0, 39.0, 9.6, 590.0, 92.0, 42.0),
                new MachineScenario(105L, StatutMachine.ALERTE, GraviteType.ELEVEE, 88.0, 34.0, 2.2, 1480.0, 78.0, 96.0),
                new MachineScenario(103L, StatutMachine.ALERTE, GraviteType.MOYENNE, 81.0, 46.0, 1.6, 950.0, 64.0, 160.0),
                new MachineScenario(1L, StatutMachine.NORMAL, GraviteType.FAIBLE, 72.0, 29.0, 0.9, 4380.0, 24.0, 330.0)
        );

        int machineOffset = 0;
        for (MachineScenario scenario : scenarios) {
            Machine machine = machineRepository.findById(scenario.machineId()).orElse(null);
            if (machine == null) {
                continue;
            }

            machine.setStatut(scenario.status());
            machineRepository.save(machine);

            for (int sample = 0; sample < 12; sample++) {
                LocalDateTime timestamp = now.minusMinutes((11L - sample) * 3L + machineOffset);
                double drift = (sample - 6) * 0.18;
                Mesure mesure = new Mesure();
                mesure.setMachine(machine);
                mesure.setHorodatage(timestamp);
                mesure.setTemperature(round(scenario.temperature() + drift));
                mesure.setCourant(round(scenario.current() + drift * 0.7));
                mesure.setVibration(round(scenario.vibration() + Math.max(0, drift * 0.2)));
                mesure.setRpm(round(scenario.rpm() + drift * 8));
                mesure.setStatut(sample > 7 ? scenario.status() : StatutMachine.NORMAL);
                mesure.setEtiquetteAnomalie(sample > 7 && scenario.risk() != GraviteType.FAIBLE);
                mesure = mesureRepository.save(mesure);

                Prediction prediction = new Prediction();
                prediction.setMachine(machine);
                prediction.setMesure(mesure);
                prediction.setStatutPredit(mesure.getStatut());
                prediction.setNiveauRisque(sample > 7 ? scenario.risk() : GraviteType.FAIBLE);
                prediction.setConfiance(round(Math.min(96.0, 68.0 + sample * 2.1)));
                prediction.setDateCreation(timestamp.plusSeconds(20));
                prediction.setInputFeaturesJson("""
                        {"temperature":%.2f,"courant":%.2f,"vibration":%.2f,"rpm":%.2f}
                        """.formatted(mesure.getTemperature(), mesure.getCourant(), mesure.getVibration(), mesure.getRpm()).trim());
                prediction.setOutputLabel("ETAT_" + prediction.getNiveauRisque().name());
                prediction.setProbability(round(Math.min(0.98, scenario.anomalyScore() / 100.0)));
                prediction.setAnomalyScore(round(sample > 7 ? scenario.anomalyScore() : scenario.anomalyScore() * 0.35));
                prediction.setRulHours(round(scenario.rulHours() - sample * 1.5));
                prediction.setRulDays(round(prediction.getRulHours() / 24.0));
                prediction.setFinalDecision(decisionFor(prediction.getNiveauRisque()));
                prediction.setModelName("diagnostic_model");
                prediction.setModelVersion("v1.0.0-dev");
                prediction.setExplanation(explanationFor(machine, prediction.getNiveauRisque()));
                prediction.setRawOutputJson("""
                        {"source":"dev-seed","risk":"%s","confidence":%.2f,"anomalyScore":%.2f}
                        """.formatted(prediction.getNiveauRisque(), prediction.getConfiance(), prediction.getAnomalyScore()).trim());
                predictionRepository.save(prediction);

                if (sample == 11 && scenario.risk() != GraviteType.FAIBLE) {
                    Anomalie anomalie = new Anomalie();
                    anomalie.setMesure(mesure);
                    anomalie.setType("Predictive threshold breach");
                    anomalie.setDescription("Deviation detected on " + machine.getNom() + " from vibration and current trend.");
                    anomalie.setGravite(scenario.risk());
                    anomalie.setScore(scenario.anomalyScore());
                    anomalie.setDateDetection(timestamp.plusSeconds(35));
                    anomalie = anomalieRepository.save(anomalie);

                    Alerte alerte = new Alerte();
                    alerte.setAnomalie(anomalie);
                    alerte.setMachine(machine);
                    alerte.setMessage("Prediction " + prediction.getOutputLabel() + " on " + machine.getNom()
                            + " with decision " + prediction.getFinalDecision());
                    alerte.setGravite(scenario.risk());
                    alerte.setStatut(StatutAlerte.OPEN);
                    alerte.setDateCreation(timestamp.plusSeconds(45));
                    alerte.setSlaDeadline(timestamp.plusHours(scenario.risk() == GraviteType.CRITIQUE ? 2 : 8));
                    alerte.setEscalationLevel(scenario.risk() == GraviteType.CRITIQUE ? 2 : 1);
                    alerte.setNotificationChannel("dashboard");
                    alerteRepository.save(alerte);
                }
            }

            RulPrediction rul = new RulPrediction();
            rul.setMachine(machine);
            rul.setMesure(mesureRepository.findTopByMachineIdOrderByHorodatageDesc(machine.getId()).orElse(null));
            rul.setPredictedAt(now.minusMinutes(machineOffset));
            rul.setRulHours(scenario.rulHours());
            rul.setRulDays(round(scenario.rulHours() / 24.0));
            rul.setTimeToFailureHours(round(scenario.rulHours() * 1.08));
            rul.setConfidence(round(0.74 + machineOffset * 0.04));
            rul.setMethod("dev_simulation");
            rul.setSimulated(true);
            rul.setExplanation("Seeded local trend for " + machine.getNom() + ".");
            rul.setRawOutputJson("{\"source\":\"dev-seed\"}");
            rulPredictionRepository.save(rul);

            machineOffset += 2;
        }

        if (driftCheckRepository.count() == 0) {
            for (int i = 0; i < scenarios.size(); i++) {
                Machine machine = machineRepository.findById(scenarios.get(i).machineId()).orElse(null);
                DriftCheck drift = new DriftCheck();
                drift.setMachine(machine);
                drift.setCheckedAt(now.minusMinutes(i * 12L));
                drift.setStatus(i == 0 ? "WATCH" : "STABLE");
                drift.setScope("machine");
                drift.setPsiScore(round(0.08 + i * 0.03));
                drift.setDetailsJson("{\"source\":\"dev-seed\"}");
                driftCheckRepository.save(drift);
            }
        }

        log.info("Seeded local dashboard data: {} measures, {} alerts", mesureRepository.count(), alerteRepository.count());
    }

    private void seedModelRegistry() {
        if (modelRegistryEntryRepository.findTopByModelNameAndStatusOrderByTrainingDateDesc("diagnostic_model", "production").isPresent()) {
            return;
        }

        ModelRegistryEntry entry = new ModelRegistryEntry();
        entry.setModelName("diagnostic_model");
        entry.setVersion("v1.0.0-dev");
        entry.setArtifactPath("ai/models/diagnostic_model.pkl");
        entry.setTrainingDate(LocalDateTime.now().minusDays(7));
        entry.setStatus("production");
        entry.setMetricsJson("{\"accuracy\":0.94,\"f1Score\":0.91,\"source\":\"dev-seed\"}");
        modelRegistryEntryRepository.save(entry);
    }

    private String decisionFor(GraviteType risk) {
        return switch (risk) {
            case CRITIQUE -> "ARRET_RECOMMANDE";
            case ELEVEE -> "INSPECTION_PRIORITAIRE";
            case MOYENNE -> "SURVEILLANCE_RENFORCEE";
            case FAIBLE -> "CONTINUER_OPERATION";
        };
    }

    private String explanationFor(Machine machine, GraviteType risk) {
        return String.format(
                Locale.ROOT,
                "%s classified as %s from vibration, current and thermal deviation against local operating baseline.",
                machine.getNom(),
                risk
        );
    }

    private double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }

    private record MachineSeed(
            Long id,
            String name,
            String type,
            String location,
            Double temperatureMax,
            Double courantMax,
            Double vibrationMax,
            Double rpmMax
    ) {
    }

    private record MachineScenario(
            Long machineId,
            StatutMachine status,
            GraviteType risk,
            Double temperature,
            Double current,
            Double vibration,
            Double rpm,
            Double anomalyScore,
            Double rulHours
    ) {
    }
}
