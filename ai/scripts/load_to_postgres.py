import os
import sys
from pathlib import Path

import pandas as pd
import psycopg2
from psycopg2.extras import execute_batch

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from maintenance_core import OUTPUTS_DIR

DB_CONFIG = {
    "host": os.getenv("POSTGRES_HOST", "localhost"),
    "port": int(os.getenv("POSTGRES_PORT", "5432")),
    "dbname": os.getenv("POSTGRES_DB", "supervision_moteur_db"),
    "user": os.getenv("POSTGRES_USER", "postgres"),
    "password": os.getenv("POSTGRES_PASSWORD", "samia"),
}

mesures = pd.read_csv(OUTPUTS_DIR / "mesures.csv")
anomalies = pd.read_csv(OUTPUTS_DIR / "anomalies.csv")
predictions = pd.read_csv(OUTPUTS_DIR / "predictions.csv")
alertes = pd.read_csv(OUTPUTS_DIR / "alertes.csv")

# Nettoyage des lignes invalides sur les clés
mesures = mesures.dropna(subset=["id", "machine_id"]).copy()
anomalies = anomalies.dropna(subset=["id", "mesure_id"]).copy()
predictions = predictions.dropna(subset=["id", "mesure_id"]).copy()
alertes = alertes.dropna(subset=["id", "anomalie_id"]).copy()

# Conversion propre des ids
for df, cols in [
    (mesures, ["id", "machine_id"]),
    (anomalies, ["id", "mesure_id"]),
    (predictions, ["id", "mesure_id"]),
    (alertes, ["id", "anomalie_id"]),
]:
    for col in cols:
        df[col] = pd.to_numeric(df[col], errors="coerce")
    df.dropna(subset=cols, inplace=True)
    for col in cols:
        df[col] = df[col].astype(int)
def normalize_gravite(value: str) -> str:
    if pd.isna(value):
        return "FAIBLE"
    value = str(value).strip().upper()

    if value == "MOYEN":
        return "MOYENNE"
    if value == "MOYENNE":
        return "MOYENNE"
    if value == "ÉLEVÉE":
        return "ELEVEE"
    if value == "ELEVEE":
        return "ELEVEE"
    if value == "CRITIQUE":
        return "CRITIQUE"
    if value == "FAIBLE":
        return "FAIBLE"

    return "FAIBLE"

def normalize_niveau_risque(value: str) -> str:
    if pd.isna(value):
        return "FAIBLE"
    value = str(value).strip().upper()

    if value == "FAIBLE":
        return "FAIBLE"
    if value == "MOYEN":
        return "MOYENNE"
    if value == "MOYENNE":
        return "MOYENNE"
    if value == "ÉLEVÉE":
        return "ELEVEE"
    if value == "ELEVEE":
        return "ELEVEE"
    if value == "CRITIQUE":
        return "CRITIQUE"

    return "FAIBLE"

print("TEST GRAVITE:", normalize_gravite("MOYEN"))
print("TEST RISQUE :", normalize_niveau_risque("MOYEN"))
def normalize_statut_machine(value: str) -> str:
    if pd.isna(value):
        return "NORMAL"
    value = str(value).strip().upper()
    mapping = {
        "NORMAL": "NORMAL",
        "ALERTE": "ALERTE",
        "CRITIQUE": "CRITIQUE",
    }
    return mapping.get(value, "NORMAL")


def normalize_statut_alerte(value: str) -> str:
    if pd.isna(value):
        return "ACTIVE"
    value = str(value).strip().upper()
    mapping = {
        "ACTIVE": "ACTIVE",
        "ACTIF": "ACTIVE",
        "INACTIVE": "INACTIVE",
        "INACTIF": "INACTIVE",
        "RESOLUE": "RESOLUE",
        "RÉSOLUE": "RESOLUE",
    }
    return mapping.get(value, "ACTIVE")


conn = psycopg2.connect(**DB_CONFIG)
cur = conn.cursor()

try:
    # vider les tables
    cur.execute("TRUNCATE TABLE alertes RESTART IDENTITY CASCADE;")
    cur.execute("TRUNCATE TABLE predictions RESTART IDENTITY CASCADE;")
    cur.execute("TRUNCATE TABLE anomalies RESTART IDENTITY CASCADE;")
    cur.execute("TRUNCATE TABLE mesures RESTART IDENTITY CASCADE;")
    conn.commit()

    # =========================
    # INSERT MESURES
    # =========================
    mesures_rows = []
    for _, row in mesures.iterrows():
        mesures_rows.append(
            (
                int(row["id"]),
                int(row["machine_id"]),
                row["horodatage"],
                float(row["temperature"]),
                float(row["courant"]),
                float(row["vibration"]),
                float(row["rpm"]),
                normalize_statut_machine(row["statut"]),
                bool(row["etiquette_anomalie"]),
            )
        )

    execute_batch(
        cur,
        """
        INSERT INTO mesures
        (id, machine_id, horodatage, temperature, courant, vibration, rpm, statut, etiquette_anomalie)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """,
        mesures_rows,
        page_size=1000,
    )
    conn.commit()

    # =========================
    # INSERT ANOMALIES
    # =========================
    anomalies_rows = []
    for _, row in anomalies.iterrows():
        anomalies_rows.append(
            (
                int(row["id"]),
                int(row["mesure_id"]),
                str(row["type"]),
                str(row["description"]),
                normalize_gravite(row["gravite"]),
                float(row["score"]),
                row["date_detection"],
            )
        )

    execute_batch(
        cur,
        """
        INSERT INTO anomalies
        (id, mesure_id, type, description, gravite, score, date_detection)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        """,
        anomalies_rows,
        page_size=1000,
    )
    conn.commit()

    # =========================
    # INSERT PREDICTIONS
    # =========================
    predictions_rows = []
    for _, row in predictions.iterrows():
        predictions_rows.append(
            (
                int(row["id"]),
                int(row["mesure_id"]),
                normalize_statut_machine(row["statut_predit"]),
                normalize_niveau_risque(row["niveau_risque"]),
                float(row["confiance"]),
                row["date_creation"],
            )
        )

    execute_batch(
        cur,
        """
        INSERT INTO predictions
        (id, mesure_id, statut_predit, niveau_risque, confiance, date_creation)
        VALUES (%s, %s, %s, %s, %s, %s)
        """,
        predictions_rows,
        page_size=1000,
    )
    conn.commit()

    # =========================
    # INSERT ALERTES
    # =========================
    alertes_rows = []
    for _, row in alertes.iterrows():
        alertes_rows.append(
            (
                int(row["id"]),
                int(row["anomalie_id"]),
                str(row["message"]),
                normalize_gravite(row["gravite"]),
                normalize_statut_alerte(row["statut"]),
                row["date_creation"],
            )
        )

    execute_batch(
        cur,
        """
        INSERT INTO alertes
        (id, anomalie_id, message, gravite, statut, date_creation)
        VALUES (%s, %s, %s, %s, %s, %s)
        """,
        alertes_rows,
        page_size=1000,
    )
    conn.commit()

    # reset sequences
    cur.execute(
        "SELECT setval(pg_get_serial_sequence('mesures', 'id'), COALESCE(MAX(id), 1), true) FROM mesures;"
    )
    cur.execute(
        "SELECT setval(pg_get_serial_sequence('anomalies', 'id'), COALESCE(MAX(id), 1), true) FROM anomalies;"
    )
    cur.execute(
        "SELECT setval(pg_get_serial_sequence('predictions', 'id'), COALESCE(MAX(id), 1), true) FROM predictions;"
    )
    cur.execute(
        "SELECT setval(pg_get_serial_sequence('alertes', 'id'), COALESCE(MAX(id), 1), true) FROM alertes;"
    )
    conn.commit()

    print("Import PostgreSQL terminé avec succès.")
    print(f"Mesures insérées      : {len(mesures_rows)}")
    print(f"Anomalies insérées    : {len(anomalies_rows)}")
    print(f"Predictions insérées  : {len(predictions_rows)}")
    print(f"Alertes insérées      : {len(alertes_rows)}")

except Exception as e:
    conn.rollback()
    print("Erreur pendant l'import :")
    print(e)

finally:
    cur.close()
    conn.close()
