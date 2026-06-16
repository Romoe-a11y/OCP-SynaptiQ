-- ═══════════════════════════════════════════════════════════════
-- Supabase Migration — OCP SynaptiQ
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ═══════════════════════════════════════════════════════════════

-- ── Core Tables ──

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
    date_creation TIMESTAMP,
    last_login_at TIMESTAMP,
    login_count INTEGER DEFAULT 0,
    account_locked BOOLEAN DEFAULT FALSE,
    failed_attempts INTEGER DEFAULT 0,
    notification_email BOOLEAN DEFAULT TRUE,
    notification_webhook VARCHAR(512),
    profile_picture_url TEXT
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
    mesure_id BIGINT UNIQUE REFERENCES mesures(id),
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
    escalation_level INTEGER DEFAULT 0,
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
    warning_threshold DOUBLE PRECISION NOT NULL DEFAULT 0.45,
    urgent_threshold DOUBLE PRECISION NOT NULL DEFAULT 0.70,
    stop_threshold DOUBLE PRECISION NOT NULL DEFAULT 0.85,
    tuning_goal VARCHAR(80) DEFAULT 'BALANCED',
    notes TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE drift_checks (
    id BIGSERIAL PRIMARY KEY,
    machine_id BIGINT REFERENCES machines(id),
    checked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE model_registry (
    id BIGSERIAL PRIMARY KEY,
    model_name VARCHAR(120) NOT NULL,
    version VARCHAR(80) NOT NULL,
    artifact_path TEXT,
    training_date TIMESTAMP,
    metrics_json TEXT,
    status VARCHAR(40) NOT NULL DEFAULT 'development'
);

CREATE TABLE rul_predictions (
    id BIGSERIAL PRIMARY KEY,
    machine_id BIGINT NOT NULL REFERENCES machines(id),
    mesure_id BIGINT REFERENCES mesures(id),
    predicted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    rul_hours DOUBLE PRECISION,
    rul_days DOUBLE PRECISION,
    time_to_failure_hours DOUBLE PRECISION,
    confidence DOUBLE PRECISION,
    method VARCHAR(120),
    simulated BOOLEAN DEFAULT TRUE,
    explanation TEXT,
    raw_output_json TEXT
);

CREATE TABLE audit_logs (
    id BIGSERIAL PRIMARY KEY,
    entity_type VARCHAR(80) NOT NULL,
    entity_id BIGINT,
    action VARCHAR(40) NOT NULL,
    performed_by VARCHAR(150),
    performed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent VARCHAR(512),
    old_value_json TEXT,
    new_value_json TEXT,
    details TEXT
);

CREATE TABLE refresh_tokens (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    issued_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    revoked BOOLEAN NOT NULL DEFAULT FALSE,
    revoked_at TIMESTAMP,
    device_info VARCHAR(255)
);

-- ── Indexes ──

CREATE INDEX idx_mesures_machine_horodatage ON mesures(machine_id, horodatage DESC);
CREATE INDEX idx_mesures_horodatage ON mesures(horodatage DESC);
CREATE INDEX idx_mesures_machine_statut ON mesures(machine_id, statut);
CREATE INDEX idx_mesures_temp_vib_courant ON mesures(machine_id, temperature, vibration, courant);
CREATE INDEX idx_anomalies_date_detection ON anomalies(date_detection DESC);
CREATE INDEX idx_predictions_machine_date ON predictions(machine_id, date_creation DESC);
CREATE INDEX idx_predictions_date_creation ON predictions(date_creation DESC);
CREATE INDEX idx_predictions_decision ON predictions(final_decision, date_creation DESC);
CREATE INDEX idx_predictions_model ON predictions(model_name, model_version);
CREATE INDEX idx_alertes_machine_date ON alertes(machine_id, date_creation DESC);
CREATE INDEX idx_alertes_status_sla ON alertes(statut, sla_deadline);
CREATE INDEX idx_alertes_gravite_date ON alertes(gravite, date_creation DESC);
CREATE INDEX idx_drift_checks_machine_checked ON drift_checks(machine_id, checked_at DESC);
CREATE INDEX idx_failure_history_machine_failure ON failure_history(machine_id, failure_date DESC);
CREATE INDEX idx_rul_predictions_machine_predicted ON rul_predictions(machine_id, predicted_at DESC);
CREATE INDEX idx_rul_predictions_confidence ON rul_predictions(confidence DESC);
CREATE INDEX idx_model_registry_name_status_training ON model_registry(model_name, status, training_date DESC);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_performed ON audit_logs(performed_at DESC);
CREATE INDEX idx_audit_logs_user ON audit_logs(performed_by, performed_at DESC);
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id, revoked);
CREATE INDEX idx_refresh_tokens_expiry ON refresh_tokens(expires_at) WHERE NOT revoked;

-- ── Seed Data ──

INSERT INTO machines (id, nom, type, emplacement, statut, date_creation) VALUES
    (1, 'Moteur Industriel 1', 'Moteur electrique', 'Atelier principal', 'NORMAL', CURRENT_TIMESTAMP),
    (2, 'Moteur Industriel 2', 'Moteur asynchrone', 'Atelier secondaire', 'NORMAL', CURRENT_TIMESTAMP),
    (3, 'Pompe hydraulique A', 'Pompe centrifuge', 'Zone hydraulique', 'NORMAL', CURRENT_TIMESTAMP),
    (4, 'Compresseur C1', 'Compresseur a vis', 'Salle compresseurs', 'NORMAL', CURRENT_TIMESTAMP),
    (5, 'Ventilateur V1', 'Ventilateur axial', 'Circuit refroidissement', 'NORMAL', CURRENT_TIMESTAMP);

SELECT setval(pg_get_serial_sequence('machines', 'id'), 5, true);

-- Default admin (password: admin123, BCrypt cost 12)
INSERT INTO utilisateurs (nom_complet, email, mot_de_passe, role, date_creation) VALUES
    ('Administrateur', 'admin@gmail.com', '$2b$12$CxgEwZiqzkPLFwqBGQ/PmeX544nwcAgxjG0fi7hoSDYXhj8SNNh3e', 'ADMIN', CURRENT_TIMESTAMP);

INSERT INTO configuration_seuils (machine_id, temperature_max, courant_max, vibration_max, rpm_max, date_mise_a_jour) VALUES
    (1, 80.0, 35.0, 1.2, 4500.0, CURRENT_TIMESTAMP);

INSERT INTO decision_threshold_config (warning_threshold, urgent_threshold, stop_threshold, tuning_goal, notes, updated_at) VALUES
    (0.45, 0.70, 0.85, 'BALANCED', 'Default business thresholds.', CURRENT_TIMESTAMP);
