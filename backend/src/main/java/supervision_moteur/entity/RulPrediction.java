package supervision_moteur.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "rul_predictions")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class RulPrediction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "machine_id", nullable = false)
    private Machine machine;

    @ManyToOne
    @JoinColumn(name = "mesure_id")
    private Mesure mesure;

    @Column(name = "predicted_at", nullable = false)
    private LocalDateTime predictedAt;

    @Column(name = "rul_hours")
    private Double rulHours;

    @Column(name = "rul_days")
    private Double rulDays;

    @Column(name = "time_to_failure_hours")
    private Double timeToFailureHours;

    @Column(name = "confidence")
    private Double confidence;

    @Column(name = "method", length = 120)
    private String method;

    @Column(name = "simulated")
    private Boolean simulated;

    @Column(name = "explanation", columnDefinition = "TEXT")
    private String explanation;

    @Column(name = "raw_output_json", columnDefinition = "TEXT")
    private String rawOutputJson;
}
