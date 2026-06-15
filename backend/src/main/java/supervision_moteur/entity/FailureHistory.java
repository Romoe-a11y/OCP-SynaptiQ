package supervision_moteur.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import supervision_moteur.enums.GraviteType;

import java.time.LocalDateTime;

@Entity
@Table(name = "failure_history")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class FailureHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "machine_id", nullable = false)
    private Machine machine;

    @Column(name = "failure_date", nullable = false)
    private LocalDateTime failureDate;

    @Column(name = "replaced_component", length = 150)
    private String replacedComponent;

    @Column(name = "technician_diagnosis", columnDefinition = "TEXT")
    private String technicianDiagnosis;

    @Column(name = "downtime_duration_minutes")
    private Long downtimeDurationMinutes;

    @Column(name = "repair_action", columnDefinition = "TEXT")
    private String repairAction;

    @Column(name = "actual_root_cause", columnDefinition = "TEXT")
    private String actualRootCause;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private GraviteType severity;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "created_at")
    private LocalDateTime createdAt;
}
