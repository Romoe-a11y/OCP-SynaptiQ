package supervision_moteur.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "decision_threshold_config")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DecisionThresholdConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "warning_threshold", nullable = false)
    private Double warningThreshold;

    @Column(name = "urgent_threshold", nullable = false)
    private Double urgentThreshold;

    @Column(name = "stop_threshold", nullable = false)
    private Double stopThreshold;

    @Column(name = "tuning_goal", length = 80)
    private String tuningGoal;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
