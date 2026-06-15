package supervision_moteur.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import supervision_moteur.enums.StatutMachine;

import java.time.LocalDateTime;

@Entity
@Table(name = "mesures")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Mesure {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "machine_id", nullable = false)
    private Machine machine;

    @Column(nullable = false)
    private LocalDateTime horodatage;

    @Column(nullable = false)
    private Double temperature;

    @Column(nullable = false)
    private Double courant;

    @Column(nullable = false)
    private Double vibration;

    @Column
    private Double rpm;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private StatutMachine statut;

    @Column(name = "etiquette_anomalie")
    private Boolean etiquetteAnomalie;
}