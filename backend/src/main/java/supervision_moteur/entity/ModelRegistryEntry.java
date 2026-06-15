package supervision_moteur.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "model_registry")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ModelRegistryEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "model_name", nullable = false, length = 120)
    private String modelName;

    @Column(nullable = false, length = 80)
    private String version;

    @Column(name = "artifact_path", columnDefinition = "TEXT")
    private String artifactPath;

    @Column(name = "training_date")
    private LocalDateTime trainingDate;

    @Column(name = "metrics_json", columnDefinition = "TEXT")
    private String metricsJson;

    @Column(nullable = false, length = 40)
    private String status;
}
