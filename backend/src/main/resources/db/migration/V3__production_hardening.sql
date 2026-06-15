-- ═══════════════════════════════════════════════════════════════
-- V3: Production hardening — audit log, refresh tokens, indexes
-- ═══════════════════════════════════════════════════════════════

-- ── Audit log table ──
CREATE TABLE IF NOT EXISTS audit_logs (
    id              BIGSERIAL PRIMARY KEY,
    entity_type     VARCHAR(80)  NOT NULL,
    entity_id       BIGINT,
    action          VARCHAR(40)  NOT NULL,
    performed_by    VARCHAR(150),
    performed_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ip_address      VARCHAR(45),
    user_agent      VARCHAR(512),
    old_value_json  TEXT,
    new_value_json  TEXT,
    details         TEXT
);

CREATE INDEX idx_audit_logs_entity      ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_performed   ON audit_logs(performed_at DESC);
CREATE INDEX idx_audit_logs_user        ON audit_logs(performed_by, performed_at DESC);

-- ── Refresh token storage (for token revocation) ──
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT       NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
    token_hash      VARCHAR(255) NOT NULL UNIQUE,
    issued_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at      TIMESTAMP    NOT NULL,
    revoked         BOOLEAN      NOT NULL DEFAULT FALSE,
    revoked_at      TIMESTAMP,
    device_info     VARCHAR(255)
);

CREATE INDEX idx_refresh_tokens_user    ON refresh_tokens(user_id, revoked);
CREATE INDEX idx_refresh_tokens_expiry  ON refresh_tokens(expires_at) WHERE NOT revoked;

-- ── Additional machines for demo ──
INSERT INTO machines (nom, type, emplacement, statut, date_creation)
VALUES
    ('Moteur Industriel 2', 'Moteur asynchrone', 'Atelier secondaire', 'NORMAL', CURRENT_TIMESTAMP),
    ('Pompe hydraulique A', 'Pompe centrifuge', 'Zone hydraulique', 'NORMAL', CURRENT_TIMESTAMP),
    ('Compresseur C1', 'Compresseur a vis', 'Salle compresseurs', 'NORMAL', CURRENT_TIMESTAMP),
    ('Ventilateur V1', 'Ventilateur axial', 'Circuit refroidissement', 'NORMAL', CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

-- ── Add last_login tracking to utilisateurs ──
ALTER TABLE utilisateurs
    ADD COLUMN IF NOT EXISTS last_login_at   TIMESTAMP,
    ADD COLUMN IF NOT EXISTS login_count     INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS account_locked  BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS failed_attempts INTEGER DEFAULT 0;

-- ── Performance indexes for production queries ──
CREATE INDEX IF NOT EXISTS idx_mesures_machine_statut      ON mesures(machine_id, statut);
CREATE INDEX IF NOT EXISTS idx_alertes_gravite_date        ON alertes(gravite, date_creation DESC);
CREATE INDEX IF NOT EXISTS idx_predictions_decision        ON predictions(final_decision, date_creation DESC);
CREATE INDEX IF NOT EXISTS idx_predictions_model           ON predictions(model_name, model_version);
CREATE INDEX IF NOT EXISTS idx_rul_predictions_confidence  ON rul_predictions(confidence DESC);

-- ── Add composite index for operational dashboard queries ──
CREATE INDEX IF NOT EXISTS idx_mesures_temp_vib_courant
    ON mesures(machine_id, temperature, vibration, courant);

-- ── Add notification preferences to utilisateurs ──
ALTER TABLE utilisateurs
    ADD COLUMN IF NOT EXISTS notification_email   BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS notification_webhook VARCHAR(512);
