import sys
from pathlib import Path

import numpy as np
import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from maintenance_core import (
    CLEAN_DATASET_FILE,
    RAW_DATASET_FILE,
    TIME_SERIES_FEATURE_COLUMNS,
    build_time_series_features,
)

# =========================
# HELPERS
# =========================
def normalize_score(value, low, high):
    if pd.isna(value):
        return 0.0
    if value <= low:
        return 0.0
    if value >= high:
        return 100.0
    return ((value - low) / (high - low)) * 100.0


def classify_status(temp, vibration, rpm, failure_prob, health_score):
    reasons = []

    # règles simples
    if temp >= 85:
        reasons.append("SURCHAUFFE")
    elif temp >= 70:
        reasons.append("TEMP_ELEVEE")

    if vibration >= 5.0:
        reasons.append("VIBRATION_EXCESSIVE")
    elif vibration >= 3.5:
        reasons.append("VIBRATION_ANORMALE")

    if rpm <= 1200:
        reasons.append("RPM_BAS")
    elif rpm >= 2200:
        reasons.append("RPM_ELEVE")

    if failure_prob >= 0.75:
        reasons.append("RISQUE_PANNE_ELEVE")
    elif failure_prob >= 0.45:
        reasons.append("RISQUE_PANNE_MOYEN")

    if health_score <= 0.35:
        reasons.append("SANTE_CRITIQUE")
    elif health_score <= 0.55:
        reasons.append("SANTE_DEGRADEE")

    # statut
    if (
        temp >= 85
        or vibration >= 5.0
        or failure_prob >= 0.75
        or health_score <= 0.35
    ):
        statut = "CRITIQUE"
    elif (
        temp >= 70
        or vibration >= 3.5
        or failure_prob >= 0.45
        or health_score <= 0.55
        or rpm <= 1200
        or rpm >= 2200
    ):
        statut = "ALERTE"
    else:
        statut = "NORMAL"

    return statut, reasons


def anomaly_type(reasons):
    if "SURCHAUFFE" in reasons:
        return "SURCHAUFFE"
    if "VIBRATION_EXCESSIVE" in reasons or "VIBRATION_ANORMALE" in reasons:
        return "VIBRATION_ANORMALE"
    if "RPM_BAS" in reasons or "RPM_ELEVE" in reasons:
        return "RPM_ANORMAL"
    if "RISQUE_PANNE_ELEVE" in reasons or "RISQUE_PANNE_MOYEN" in reasons:
        return "RISQUE_DEFAILLANCE"
    if "SANTE_CRITIQUE" in reasons or "SANTE_DEGRADEE" in reasons:
        return "DEGRADATION_COMPOSANT"
    return "AUCUNE"


def severity_from_status(status):
    if status == "CRITIQUE":
        return "CRITIQUE"
    if status == "ALERTE":
        return "MOYENNE"
    return "FAIBLE"


def risk_level(score):
    if score >= 75:
        return "CRITIQUE"
    if score >= 45:
        return "MOYEN"
    return "FAIBLE"


def predicted_status(risk):
    if risk == "CRITIQUE":
        return "CRITIQUE"
    if risk == "MOYEN":
        return "ALERTE"
    return "NORMAL"


# =========================
# LOAD
# =========================
input_path = Path(RAW_DATASET_FILE)
if not input_path.exists():
    raise FileNotFoundError(f"Fichier introuvable : {RAW_DATASET_FILE}")

df = pd.read_csv(RAW_DATASET_FILE)

print("Colonnes détectées :")
print(df.columns.tolist())

# =========================
# SELECT / RENAME
# =========================
required_columns = {
    "Timestamp": "horodatage",
    "Motor_Temperature": "temperature",
    "Motor_Vibration": "vibration",
    "Motor_RPM": "rpm",
    "Motor_Torque": "couple",
    "Battery_Current": "courant",
    "Failure_Probability": "failure_probability",
    "RUL": "rul",
    "TTF": "ttf",
    "Component_Health_Score": "component_health_score",
}

missing = [c for c in required_columns if c not in df.columns]
if missing:
    raise ValueError(f"Colonnes manquantes dans le CSV : {missing}")

data = df[list(required_columns.keys())].rename(columns=required_columns).copy()

# =========================
# CLEAN TYPES
# =========================
data["horodatage"] = pd.to_datetime(data["horodatage"], errors="coerce")

numeric_cols = [
    "temperature",
    "vibration",
    "rpm",
    "couple",
    "courant",
    "failure_probability",
    "rul",
    "ttf",
    "component_health_score",
]

for col in numeric_cols:
    data[col] = pd.to_numeric(data[col], errors="coerce")

# enlève lignes invalides
data = data.dropna(subset=["horodatage", "temperature", "vibration", "rpm"]).reset_index(drop=True)

# =========================
# NORMALIZE SOME FIELDS
# =========================
# Si failure_probability ou component_health_score sont > 1, on les remet sur [0,1]
if data["failure_probability"].max() > 1:
    fp_max = data["failure_probability"].max()
    if fp_max != 0:
        data["failure_probability"] = data["failure_probability"] / fp_max

if data["component_health_score"].max() > 1:
    hs_max = data["component_health_score"].max()
    if hs_max != 0:
        data["component_health_score"] = data["component_health_score"] / hs_max

# =========================
# BUILD STATUS / ANOMALIES
# =========================
statuses = []
reason_lists = []
types = []
gravities = []

for _, row in data.iterrows():
    status, reasons = classify_status(
        temp=row["temperature"],
        vibration=row["vibration"],
        rpm=row["rpm"],
        failure_prob=row["failure_probability"],
        health_score=row["component_health_score"],
    )
    statuses.append(status)
    reason_lists.append(", ".join(reasons) if reasons else "AUCUNE")
    types.append(anomaly_type(reasons))
    gravities.append(severity_from_status(status))

data["statut"] = statuses
data["raisons"] = reason_lists
data["type_anomalie"] = types
data["gravite"] = gravities
data["etiquette_anomalie"] = data["statut"].isin(["ALERTE", "CRITIQUE"])

# =========================
# SCORE ANOMALIE
# =========================
temp_score = data["temperature"].apply(lambda x: normalize_score(x, 55, 95))
vib_score = data["vibration"].apply(lambda x: normalize_score(x, 2.0, 6.5))

# écart RPM par rapport à une zone normale approximative [1350, 1900]
rpm_score = data["rpm"].apply(
    lambda x: 0.0 if 1350 <= x <= 1900 else min(100.0, abs(x - 1600) / 10.0)
)

failure_score = data["failure_probability"] * 100.0
health_penalty = (1 - data["component_health_score"]) * 100.0

data["score_anomalie"] = (
    0.30 * temp_score
    + 0.30 * vib_score
    + 0.15 * rpm_score
    + 0.15 * failure_score
    + 0.10 * health_penalty
).round(2)

# =========================
# RISK / PREDICTION
# =========================
data["niveau_risque"] = data["score_anomalie"].apply(risk_level)
data["statut_predit"] = data["niveau_risque"].apply(predicted_status)

# confiance simple
data["confiance"] = (
    55
    + (data["failure_probability"] * 20)
    + ((1 - data["component_health_score"]) * 15)
    + (data["score_anomalie"] / 100 * 10)
).clip(55, 98).round(2)

# =========================
# ADD MACHINE INFO
# =========================
data["machine_id"] = 1
data["nom_machine"] = "Moteur Industriel 1"

# =========================
# TIME-SERIES FEATURES
# =========================
data = build_time_series_features(data)

# =========================
# FINAL ORDER
# =========================
final_columns = [
    "machine_id",
    "nom_machine",
    "horodatage",
    "temperature",
    "courant",
    "vibration",
    "couple",
    "rpm",
    "failure_probability",
    "rul",
    "ttf",
    "component_health_score",
    *TIME_SERIES_FEATURE_COLUMNS,
    "statut",
    "etiquette_anomalie",
    "type_anomalie",
    "gravite",
    "score_anomalie",
    "niveau_risque",
    "statut_predit",
    "confiance",
    "raisons",
]

data = data[final_columns]

# =========================
# EXPORT
# =========================
CLEAN_DATASET_FILE.parent.mkdir(parents=True, exist_ok=True)
data.to_csv(CLEAN_DATASET_FILE, index=False, encoding="utf-8")
print(f"Fichier genere : {CLEAN_DATASET_FILE}")
print(data.head(10))
print("\nRépartition des statuts :")
print(data["statut"].value_counts())
