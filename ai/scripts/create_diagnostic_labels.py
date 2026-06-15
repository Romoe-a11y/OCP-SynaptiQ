import sys
import os
from pathlib import Path

import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from maintenance_core import (
    CLEAN_DATASET_FILE,
    FEATURE_COLUMNS,
    LABELED_DATASET_FILE,
    RAW_FEATURE_COLUMNS,
    add_diagnostic_metadata,
    add_failure_supervision_labels,
    build_time_series_features,
    get_diagnostic_label,
)

required_columns = RAW_FEATURE_COLUMNS + ["score_anomalie", "niveau_risque"]

if not CLEAN_DATASET_FILE.exists():
    raise FileNotFoundError(f"Fichier introuvable : {CLEAN_DATASET_FILE}")

df = pd.read_csv(CLEAN_DATASET_FILE)

missing = [col for col in required_columns if col not in df.columns]
if missing:
    raise ValueError(f"Colonnes manquantes : {missing}")

for col in required_columns:
    if col != "niveau_risque":
        df[col] = pd.to_numeric(df[col], errors="coerce")

df = build_time_series_features(df)

missing_features = [col for col in FEATURE_COLUMNS if col not in df.columns]
if missing_features:
    raise ValueError(f"Colonnes features manquantes : {missing_features}")

def load_failure_history() -> pd.DataFrame:
    try:
        import psycopg2

        conn = psycopg2.connect(
            host=os.getenv("POSTGRES_HOST", "localhost"),
            port=int(os.getenv("POSTGRES_PORT", "5432")),
            dbname=os.getenv("POSTGRES_DB", "supervision_moteur_db"),
            user=os.getenv("POSTGRES_USER", "postgres"),
            password=os.getenv("POSTGRES_PASSWORD", "samia"),
        )
        try:
            history = pd.read_sql_query(
                "SELECT machine_id, failure_date, severity, actual_root_cause FROM failure_history",
                conn,
            )
            if not history.empty:
                return history
        finally:
            conn.close()
    except Exception as exc:
        print(f"Historique de pannes PostgreSQL indisponible : {exc}")

    fallback = PROJECT_ROOT / "data" / "failure_history.csv"
    if fallback.exists():
        return pd.read_csv(fallback)
    return pd.DataFrame()


failure_history = load_failure_history()
if not failure_history.empty:
    df = add_failure_supervision_labels(df, failure_history)
    df["diagnostic_label"] = df["supervised_label"]
    print("Etiquettes supervisees creees depuis l'historique reel de maintenance.")
else:
    df["diagnostic_label"] = df.apply(get_diagnostic_label, axis=1)
    df["supervised_label_source"] = "rule_generated"
    df["time_to_failure_hours"] = pd.NA
    print("Aucun historique reel de pannes disponible; etiquettes de diagnostic regles conservees.")

df = add_diagnostic_metadata(df)

LABELED_DATASET_FILE.parent.mkdir(parents=True, exist_ok=True)
df.to_csv(LABELED_DATASET_FILE, index=False, encoding="utf-8")

print(f"Fichier genere : {LABELED_DATASET_FILE}")
print()
print("Repartition des diagnostics :")
print(df["diagnostic_label"].value_counts())
print()
print("Exemple de lignes :")
print(
    df[
        [
            "temperature",
            "courant",
            "vibration",
            "rpm",
            "diagnostic_label",
            "cause_probable",
            "recommandation",
            "decision",
        ]
    ].head(10)
)
