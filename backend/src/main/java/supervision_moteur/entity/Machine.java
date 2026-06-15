package supervision_moteur.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import supervision_moteur.enums.StatutMachine;

import java.time.LocalDateTime;

@Entity
@Table(name = "machines")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Machine {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String nom;

    @Column(length = 100)
    private String type;

    @Column(length = 150)
    private String emplacement;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private StatutMachine statut;

    @Column(name = "date_creation")
    private LocalDateTime dateCreation;
}