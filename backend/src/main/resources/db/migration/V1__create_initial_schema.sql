CREATE TABLE machines (
    id BIGSERIAL PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    type VARCHAR(100),
    emplacement VARCHAR(150),
    statut VARCHAR(20) NOT NULL CHECK (statut IN ('NORMAL', 'ALERTE', 'CRITIQUE')),
    date_creation TIMESTAMP
);

CREATE TABLE utilisateurs (
    id BIGSERIAL PRIMARY KEY,
    nom_complet VARCHAR(100) NOT NULL,
    email VARCHAR(120) NOT NULL UNIQUE,
    mot_de_passe VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('ADMIN', 'UTILISATEUR')),
    date_creation TIMESTAMP
);

CREATE TABLE mesures (
    id BIGSERIAL PRIMARY KEY,
    machine_id BIGINT NOT NULL REFERENCES machines(id),
    horodatage TIMESTAMP NOT NULL,
    temperature DOUBLE PRECISION NOT NULL,
    courant DOUBLE PRECISION NOT NULL,
    vibration DOUBLE PRECISION NOT NULL,
    rpm DOUBLE PRECISION,
    statut VARCHAR(20) NOT NULL CHECK (statut IN ('NORMAL', 'ALERTE', 'CRITIQUE')),
    etiquette_anomalie BOOLEAN
);

CREATE TABLE anomalies (
    id BIGSERIAL PRIMARY KEY,
    mesure_id BIGINT NOT NULL UNIQUE REFERENCES mesures(id),
    type VARCHAR(100) NOT NULL,
    description TEXT,
    gravite VARCHAR(20) NOT NULL CHECK (gravite IN ('FAIBLE', 'MOYENNE', 'ELEVEE', 'CRITIQUE')),
    score DOUBLE PRECISION,
    date_detection TIMESTAMP
);

CREATE TABLE predictions (
    id BIGSERIAL PRIMARY KEY,
    mesure_id BIGINT REFERENCES mesures(id),
    machine_id BIGINT REFERENCES machines(id),
    statut_predit VARCHAR(20) NOT NULL CHECK (statut_predit IN ('NORMAL', 'ALERTE', 'CRITIQUE')),
    niveau_risque VARCHAR(20) NOT NULL CHECK (niveau_risque IN ('FAIBLE', 'MOYENNE', 'ELEVEE', 'CRITIQUE')),
    confiance DOUBLE PRECISION,
    date_creation TIMESTAMP,
    input_features_json TEXT,
    output_label VARCHAR(120),
    probability DOUBLE PRECISION,
    anomaly_score DOUBLE PRECISION,
    rul_hours DOUBLE PRECISION,
    rul_days DOUBLE PRECISION,
    final_decision VARCHAR(120),
    model_name VARCHAR(120),
    model_version VARCHAR(80),
    explanation TEXT,
    raw_output_json TEXT
);

CREATE TABLE alertes (
    id BIGSERIAL PRIMARY KEY,
    anomalie_id BIGINT UNIQUE REFERENCES anomalies(id),
    machine_id BIGINT REFERENCES machines(id),
    message TEXT NOT NULL,
    gravite VARCHAR(20) NOT NULL CHECK (gravite IN ('FAIBLE', 'MOYENNE', 'ELEVEE', 'CRITIQUE')),
    statut VARCHAR(20) NOT NULL CHECK (statut IN ('OPEN', 'ACKNOWLEDGED', 'ASSIGNED', 'RESOLVED', 'ESCALATED', 'ACTIVE', 'LUE', 'RESOLUE')),
    date_creation TIMESTAMP,
    assigned_technician VARCHAR(150),
    acknowledged_by VARCHAR(150),
    resolved_by VARCHAR(150),
    acknowledged_at TIMESTAMP,
    resolved_at TIMESTAMP,
    sla_deadline TIMESTAMP,
    escalation_level INTEGER,
    notification_channel VARCHAR(100),
    resolution_notes TEXT
);

CREATE TABLE configuration_seuils (
    id BIGSERIAL PRIMARY KEY,
    machine_id BIGINT NOT NULL UNIQUE REFERENCES machines(id),
    temperature_max DOUBLE PRECISION NOT NULL,
    courant_max DOUBLE PRECISION NOT NULL,
    vibration_max DOUBLE PRECISION NOT NULL,
    rpm_max DOUBLE PRECISION,
    date_mise_a_jour TIMESTAMP
);

CREATE TABLE decision_threshold_config (
    id BIGSERIAL PRIMARY KEY,
    warning_threshold DOUBLE PRECISION NOT NULL,
    urgent_threshold DOUBLE PRECISION NOT NULL,
    stop_threshold DOUBLE PRECISION NOT NULL,
    tuning_goal VARCHAR(80),
    notes TEXT,
    updated_at TIMESTAMP
);

CREATE TABLE drift_checks (
    id BIGSERIAL PRIMARY KEY,
    machine_id BIGINT REFERENCES machines(id),
    checked_at TIMESTAMP NOT NULL,
    status VARCHAR(40) NOT NULL,
    scope VARCHAR(40) NOT NULL,
    psi_score DOUBLE PRECISION,
    details_json TEXT
);

CREATE TABLE failure_history (
    id BIGSERIAL PRIMARY KEY,
    machine_id BIGINT NOT NULL REFERENCES machines(id),
    failure_date TIMESTAMP NOT NULL,
    replaced_component VARCHAR(150),
    technician_diagnosis TEXT,
    downtime_duration_minutes BIGINT,
    repair_action TEXT,
    actual_root_cause TEXT,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('FAIBLE', 'MOYENNE', 'ELEVEE', 'CRITIQUE')),
    notes TEXT,
    created_at TIMESTAMP
);

CREATE TABLE model_registry (
    id BIGSERIAL PRIMARY KEY,
    model_name VARCHAR(120) NOT NULL,
    version VARCHAR(80) NOT NULL,
    artifact_path TEXT,
    training_date TIMESTAMP,
    metrics_json TEXT,
    status VARCHAR(40) NOT NULL
);

CREATE TABLE rul_predictions (
    id BIGSERIAL PRIMARY KEY,
    machine_id BIGINT NOT NULL REFERENCES machines(id),
    mesure_id BIGINT REFERENCES mesures(id),
    predicted_at TIMESTAMP NOT NULL,
    rul_hours DOUBLE PRECISION,
    rul_days DOUBLE PRECISION,
    time_to_failure_hours DOUBLE PRECISION,
    confidence DOUBLE PRECISION,
    method VARCHAR(120),
    simulated BOOLEAN,
    explanation TEXT,
    raw_output_json TEXT
);

CREATE INDEX idx_mesures_machine_horodatage ON mesures(machine_id, horodatage DESC);
CREATE INDEX idx_mesures_horodatage ON mesures(horodatage DESC);
CREATE INDEX idx_anomalies_date_detection ON anomalies(date_detection DESC);
CREATE INDEX idx_predictions_machine_date ON predictions(machine_id, date_creation DESC);
CREATE INDEX idx_predictions_date_creation ON predictions(date_creation DESC);
CREATE INDEX idx_alertes_machine_date ON alertes(machine_id, date_creation DESC);
CREATE INDEX idx_alertes_status_sla ON alertes(statut, sla_deadline);
CREATE INDEX idx_drift_checks_machine_checked ON drift_checks(machine_id, checked_at DESC);
CREATE INDEX idx_failure_history_machine_failure ON failure_history(machine_id, failure_date DESC);
CREATE INDEX idx_rul_predictions_machine_predicted ON rul_predictions(machine_id, predicted_at DESC);
CREATE INDEX idx_model_registry_name_status_training ON model_registry(model_name, status, training_date DESC);
