package supervision_moteur.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "drift_checks")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DriftCheck {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "machine_id")
    private Machine machine;

    @Column(name = "checked_at", nullable = false)
    private LocalDateTime checkedAt;

    @Column(nullable = false, length = 40)
    private String status;

    @Column(name = "scope", nullable = false, length = 40)
    private String scope;

    @Column(name = "psi_score")
    private Double psiScore;

    @Column(name = "details_json", columnDefinition = "TEXT")
    private String detailsJson;
}
