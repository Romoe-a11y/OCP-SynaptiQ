"""
Seed realistic OCP Group (Khouribga) machine data into the database.
Replaces generic "Moteur Industriel" names with real OCP equipment.
"""
import os

import psycopg2

conn = psycopg2.connect(
    host=os.getenv("POSTGRES_HOST", "localhost"),
    port=int(os.getenv("POSTGRES_PORT", "5432")),
    dbname=os.getenv("POSTGRES_DB", "supervision_moteur_db"),
    user=os.getenv("POSTGRES_USER", "postgres"),
    password=os.getenv("POSTGRES_PASSWORD", "samia"),
    sslmode=os.getenv("POSTGRES_SSLMODE", "prefer"),
)
cur = conn.cursor()

# ── Real OCP Khouribga phosphate mining machines ──
MACHINES = [
    (1,   "Broyeur Primaire BK-01",       "Broyeur a boulets",     "Usine de Traitement Khouribga — Ligne 1",  "NORMAL"),
    (102, "Convoyeur Principal CV-200",    "Convoyeur a bande",     "Mine Sidi Chennane — Axe Transport",       "ALERTE"),
    (103, "Pompe Slurry SP-045",           "Pompe centrifuge",      "Pipeline Khouribga–Jorf Lasfar — Station 3", "CRITIQUE"),
    (104, "Ventilateur Exhaure VE-12",     "Ventilateur industriel","Mine Merah Lahrach — Galerie Sud",         "NORMAL"),
    (105, "Compresseur Atlas AC-380",      "Compresseur a vis",     "Usine de Séchage — Unité 2",              "ALERTE"),
    (106, "Concasseur Giratoire CG-07",   "Concasseur primaire",   "Carrière Beni Amir — Zone d'Extraction",  "CRITIQUE"),
]

# ── Real OCP users ──
USERS = [
    ("Ing. Samia Talbani",   "admin@gmail.com",  "ADMIN"),
]

# ── Thresholds per machine (tuned to each motor type) ──
THRESHOLDS = {
    1:   {"temp": 85.0, "courant": 45.0, "vibration": 1.5, "rpm": 1800.0},  # Broyeur — heavy load
    102: {"temp": 70.0, "courant": 30.0, "vibration": 1.0, "rpm": 3000.0},  # Convoyeur
    103: {"temp": 75.0, "courant": 50.0, "vibration": 0.8, "rpm": 2900.0},  # Pompe slurry
    104: {"temp": 65.0, "courant": 25.0, "vibration": 0.6, "rpm": 3500.0},  # Ventilateur
    105: {"temp": 90.0, "courant": 40.0, "vibration": 1.2, "rpm": 1500.0},  # Compresseur
    106: {"temp": 95.0, "courant": 55.0, "vibration": 2.0, "rpm": 900.0},   # Concasseur
}

print("Updating machines to OCP Khouribga equipment...")
for mid, nom, mtype, empl, statut in MACHINES:
    cur.execute(
        "UPDATE machines SET nom=%s, type=%s, emplacement=%s, statut=%s WHERE id=%s",
        (nom, mtype, empl, statut, mid),
    )
    print(f"  [{mid}] {nom} — {empl}")
conn.commit()

print("\nUpdating user names...")
for name, email, role in USERS:
    cur.execute(
        "UPDATE utilisateurs SET nom_complet=%s WHERE email=%s",
        (name, email),
    )
    print(f"  {email} → {name}")
conn.commit()

print("\nUpdating thresholds per machine...")
for mid, thresh in THRESHOLDS.items():
    cur.execute(
        """INSERT INTO configuration_seuils (machine_id, temperature_max, courant_max, vibration_max, rpm_max, date_mise_a_jour)
           VALUES (%s, %s, %s, %s, %s, NOW())
           ON CONFLICT (machine_id) DO UPDATE SET
               temperature_max=EXCLUDED.temperature_max,
               courant_max=EXCLUDED.courant_max,
               vibration_max=EXCLUDED.vibration_max,
               rpm_max=EXCLUDED.rpm_max,
               date_mise_a_jour=NOW()""",
        (mid, thresh["temp"], thresh["courant"], thresh["vibration"], thresh["rpm"]),
    )
    print(f"  Machine {mid}: T<{thresh['temp']}°C  I<{thresh['courant']}A  V<{thresh['vibration']}  RPM<{thresh['rpm']}")
conn.commit()

print("\nOCP Khouribga seed complete!")
cur.close()
conn.close()
