package supervision_moteur.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "configuration_seuils")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ConfigurationSeuils {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne
    @JoinColumn(name = "machine_id", nullable = false, unique = true)
    private Machine machine;

    @Column(name = "temperature_max", nullable = false)
    private Double temperatureMax;

    @Column(name = "courant_max", nullable = false)
    private Double courantMax;

    @Column(name = "vibration_max", nullable = false)
    private Double vibrationMax;

    @Column(name = "rpm_max")
    private Double rpmMax;
    @Column(name = "date_mise_a_jour")
    private LocalDateTime dateMiseAJour;
}