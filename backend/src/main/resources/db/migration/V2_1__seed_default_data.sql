INSERT INTO machines (id, nom, type, emplacement, statut, date_creation)
VALUES (1, 'Moteur Industriel 1', 'Moteur electrique', 'Atelier principal', 'NORMAL', CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('machines', 'id'), COALESCE((SELECT MAX(id) FROM machines), 1), true);

-- Password is BCrypt-hashed (cost 12): admin123
INSERT INTO utilisateurs (nom_complet, email, mot_de_passe, role, date_creation)
VALUES
    ('Administrateur', 'admin@gmail.com', '$2b$12$CxgEwZiqzkPLFwqBGQ/PmeX544nwcAgxjG0fi7hoSDYXhj8SNNh3e', 'ADMIN', CURRENT_TIMESTAMP)
ON CONFLICT (email) DO NOTHING;

INSERT INTO configuration_seuils (
    machine_id,
    temperature_max,
    courant_max,
    vibration_max,
    rpm_max,
    date_mise_a_jour
)
VALUES (1, 80.0, 35.0, 1.2, 4500.0, CURRENT_TIMESTAMP)
ON CONFLICT (machine_id) DO NOTHING;

INSERT INTO decision_threshold_config (
    warning_threshold,
    urgent_threshold,
    stop_threshold,
    tuning_goal,
    notes,
    updated_at
)
VALUES (
    0.45,
    0.70,
    0.85,
    'BALANCED',
    'Default business thresholds. Raise values to reduce false alarms; lower values to reduce missed critical failures.',
    CURRENT_TIMESTAMP
);
