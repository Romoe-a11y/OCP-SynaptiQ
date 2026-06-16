package supervision_moteur.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import supervision_moteur.entity.Utilisateur;

import java.util.Optional;

public interface UtilisateurRepository extends JpaRepository<Utilisateur, Long> {
    Optional<Utilisateur> findByEmail(String email);
    Optional<Utilisateur> findByEmailIgnoreCase(String email);
    boolean existsByEmail(String email);
    boolean existsByEmailAndIdNot(String email, Long id);
}
