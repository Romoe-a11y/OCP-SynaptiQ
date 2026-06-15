package supervision_moteur.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import supervision_moteur.entity.ConfigurationSeuils;

public interface ConfigurationSeuilsRepository extends JpaRepository<ConfigurationSeuils, Long> {
}
