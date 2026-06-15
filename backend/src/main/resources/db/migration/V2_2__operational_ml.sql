DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'statut_alerte') THEN
        ALTER TYPE statut_alerte ADD VALUE IF NOT EXISTS 'OPEN';
        ALTER TYPE statut_alerte ADD VALUE IF NOT EXISTS 'ACKNOWLEDGED';
        ALTER TYPE statut_alerte ADD VALUE IF NOT EXISTS 'ASSIGNED';
        ALTER TYPE statut_alerte ADD VALUE IF NOT EXISTS 'RESOLVED';
        ALTER TYPE statut_alerte ADD VALUE IF NOT EXISTS 'ESCALATED';
    END IF;
END $$;

ALTER TABLE IF EXISTS alertes
    ALTER COLUMN anomalie_id DROP NOT NULL,
    ADD COLUMN IF NOT EXISTS machine_id BIGINT REFERENCES machines(id),
    ADD COLUMN IF NOT EXISTS assigned_technician VARCHAR(150),
    ADD COLUMN IF NOT EXISTS acknowledged_by VARCHAR(150),
    ADD COLUMN IF NOT EXISTS resolved_by VARCHAR(150),
    ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS sla_deadline TIMESTAMP,
    ADD COLUMN IF NOT EXISTS escalation_level INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS notification_channel VARCHAR(100),
    ADD COLUMN IF NOT EXISTS resolution_notes TEXT;

ALTER TABLE IF EXISTS predictions
    ALTER COLUMN mesure_id DROP NOT NULL,
    ADD COLUMN IF NOT EXISTS machine_id BIGINT REFERENCES machines(id),
    ADD COLUMN IF NOT EXISTS input_features_json TEXT,
    ADD COLUMN IF NOT EXISTS output_label VARCHAR(120),
    ADD COLUMN IF NOT EXISTS probability DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS anomaly_score DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS rul_hours DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS rul_days DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS final_decision VARCHAR(120),
    ADD COLUMN IF NOT EXISTS model_name VARCHAR(120),
    ADD COLUMN IF NOT EXISTS model_version VARCHAR(80),
    ADD COLUMN IF NOT EXISTS explanation TEXT,
    ADD COLUMN IF NOT EXISTS raw_output_json TEXT;

CREATE TABLE IF NOT EXISTS failure_history (
    id BIGSERIAL PRIMARY KEY,
    machine_id BIGINT NOT NULL REFERENCES machines(id),
    failure_date TIMESTAMP NOT NULL,
    replaced_component VARCHAR(150),
    technician_diagnosis TEXT,
    downtime_duration_minutes BIGINT,
    repair_action TEXT,
    actual_root_cause TEXT,
    severity gravite_type NOT NULL DEFAULT 'MOYENNE',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rul_predictions (
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

CREATE TABLE IF NOT EXISTS decision_threshold_config (
    id BIGSERIAL PRIMARY KEY,
    warning_threshold DOUBLE PRECISION NOT NULL DEFAULT 0.45,
    urgent_threshold DOUBLE PRECISION NOT NULL DEFAULT 0.70,
    stop_threshold DOUBLE PRECISION NOT NULL DEFAULT 0.85,
    tuning_goal VARCHAR(80) DEFAULT 'BALANCED',
    notes TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS drift_checks (
    id BIGSERIAL PRIMARY KEY,
    machine_id BIGINT REFERENCES machines(id),
    checked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(40) NOT NULL,
    scope VARCHAR(40) NOT NULL,
    psi_score DOUBLE PRECISION,
    details_json TEXT
);

CREATE TABLE IF NOT EXISTS model_registry (
    id BIGSERIAL PRIMARY KEY,
    model_name VARCHAR(120) NOT NULL,
    version VARCHAR(80) NOT NULL,
    artifact_path TEXT,
    training_date TIMESTAMP,
    metrics_json TEXT,
    status VARCHAR(40) NOT NULL DEFAULT 'development'
);

CREATE INDEX IF NOT EXISTS idx_failure_history_machine_date ON failure_history(machine_id, failure_date DESC);
CREATE INDEX IF NOT EXISTS idx_predictions_machine_date ON predictions(machine_id, date_creation DESC);
CREATE INDEX IF NOT EXISTS idx_rul_predictions_machine_date ON rul_predictions(machine_id, predicted_at DESC);
CREATE INDEX IF NOT EXISTS idx_drift_checks_machine_date ON drift_checks(machine_id, checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_alertes_status_sla ON alertes(statut, sla_deadline);
