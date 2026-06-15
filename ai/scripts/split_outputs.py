import sys
from pathlib import Path

import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from maintenance_core import CLEAN_DATASET_FILE, OUTPUTS_DIR

OUTPUTS_DIR.mkdir(exist_ok=True)

df = pd.read_csv(CLEAN_DATASET_FILE)

# =========================
# MESURES
# =========================
mesures = df[
    [
        "machine_id",
        "nom_machine",
        "horodatage",
        "temperature",
        "courant",
        "vibration",
        "rpm",
        "statut",
        "etiquette_anomalie",
    ]
].copy()

mesures.insert(0, "id", range(1, len(mesures) + 1))
mesures.to_csv(OUTPUTS_DIR / "mesures.csv", index=False, encoding="utf-8")

# On garde une référence id mesure -> ligne source
df_with_measure_id = df.copy()
df_with_measure_id.insert(0, "mesure_id", range(1, len(df_with_measure_id) + 1))

# =========================
# ANOMALIES
# =========================
anomalies_source = df_with_measure_id[df_with_measure_id["etiquette_anomalie"] == True].copy()

anomalies = anomalies_source[
    [
        "mesure_id",
        "type_anomalie",
        "raisons",
        "gravite",
        "score_anomalie",
        "horodatage",
    ]
].copy()

anomalies.insert(0, "id", range(1, len(anomalies) + 1))

anomalies.rename(
    columns={
        "type_anomalie": "type",
        "raisons": "description",
        "score_anomalie": "score",
        "horodatage": "date_detection",
    },
    inplace=True,
)

anomalies.to_csv(OUTPUTS_DIR / "anomalies.csv", index=False, encoding="utf-8")

# =========================
# PREDICTIONS
# =========================
predictions = df_with_measure_id[
    [
        "mesure_id",
        "statut_predit",
        "niveau_risque",
        "confiance",
        "horodatage",
    ]
].copy()

predictions.insert(0, "id", range(1, len(predictions) + 1))

predictions.rename(
    columns={
        "horodatage": "date_creation",
    },
    inplace=True,
)

predictions.to_csv(OUTPUTS_DIR / "predictions.csv", index=False, encoding="utf-8")

# =========================
# ALERTES
# =========================
# Une alerte par anomalie
alertes_source = anomalies.copy()

def build_message(row):
    if row["gravite"] == "CRITIQUE":
        return f"Alerte critique : {row['type']} détectée"
    return f"Alerte : {row['type']} détectée"

alertes = pd.DataFrame()
alertes["id"] = range(1, len(alertes_source) + 1)
alertes["anomalie_id"] = alertes_source["id"]
alertes["message"] = alertes_source.apply(build_message, axis=1)
alertes["gravite"] = alertes_source["gravite"]
alertes["statut"] = "ACTIVE"
alertes["date_creation"] = alertes_source["date_detection"]

alertes.to_csv(OUTPUTS_DIR / "alertes.csv", index=False, encoding="utf-8")

print("Fichiers générés dans le dossier outputs :")
print("- mesures.csv")
print("- anomalies.csv")
print("- predictions.csv")
print("- alertes.csv")
print()
print(f"Nombre de mesures      : {len(mesures)}")
print(f"Nombre d'anomalies     : {len(anomalies)}")
print(f"Nombre de predictions  : {len(predictions)}")
print(f"Nombre d'alertes       : {len(alertes)}")
