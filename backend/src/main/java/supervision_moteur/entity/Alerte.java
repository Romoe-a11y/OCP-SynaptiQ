package supervision_moteur.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import supervision_moteur.enums.GraviteType;
import supervision_moteur.enums.StatutAlerte;

import java.time.LocalDateTime;

@Entity
@Table(name = "alertes")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Alerte {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne
    @JoinColumn(name = "anomalie_id", unique = true)
    private Anomalie anomalie;

    @ManyToOne
    @JoinColumn(name = "machine_id")
    private Machine machine;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String message;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private GraviteType gravite;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private StatutAlerte statut;

    @Column(name = "date_creation")
    private LocalDateTime dateCreation;

    @Column(name = "assigned_technician", length = 150)
    private String assignedTechnician;

    @Column(name = "acknowledged_by", length = 150)
    private String acknowledgedBy;

    @Column(name = "resolved_by", length = 150)
    private String resolvedBy;

    @Column(name = "acknowledged_at")
    private LocalDateTime acknowledgedAt;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    @Column(name = "sla_deadline")
    private LocalDateTime slaDeadline;

    @Column(name = "escalation_level")
    private Integer escalationLevel;

    @Column(name = "notification_channel", length = 100)
    private String notificationChannel;

    @Column(name = "resolution_notes", columnDefinition = "TEXT")
    private String resolutionNotes;
}
