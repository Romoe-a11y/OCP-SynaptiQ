package supervision_moteur.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import supervision_moteur.enums.GraviteType;
import supervision_moteur.enums.StatutMachine;

import java.time.LocalDateTime;

@Entity
@Table(name = "predictions")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Prediction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "mesure_id")
    private Mesure mesure;

    @ManyToOne
    @JoinColumn(name = "machine_id")
    private Machine machine;

    @Enumerated(EnumType.STRING)
    @Column(name = "statut_predit", nullable = false)
    private StatutMachine statutPredit;

    @Enumerated(EnumType.STRING)
    @Column(name = "niveau_risque", nullable = false)
    private GraviteType niveauRisque;

    @Column
    private Double confiance;

    @Column(name = "date_creation")
    private LocalDateTime dateCreation;

    @Column(name = "input_features_json", columnDefinition = "TEXT")
    private String inputFeaturesJson;

    @Column(name = "output_label", length = 120)
    private String outputLabel;

    @Column(name = "probability")
    private Double probability;

    @Column(name = "anomaly_score")
    private Double anomalyScore;

    @Column(name = "rul_hours")
    private Double rulHours;

    @Column(name = "rul_days")
    private Double rulDays;

    @Column(name = "final_decision", length = 120)
    private String finalDecision;

    @Column(name = "model_name", length = 120)
    private String modelName;

    @Column(name = "model_version", length = 80)
    private String modelVersion;

    @Column(name = "explanation", columnDefinition = "TEXT")
    private String explanation;

    @Column(name = "raw_output_json", columnDefinition = "TEXT")
    private String rawOutputJson;
}
