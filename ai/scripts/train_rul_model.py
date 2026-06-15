import json
import os
import sys
from pathlib import Path
from typing import Any

import joblib
import pandas as pd
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.model_selection import train_test_split

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from maintenance_core import (
    CLEAN_DATASET_FILE,
    FEATURE_COLUMNS,
    RUL_MODEL_FILE,
    build_rul_training_frame,
    now_utc_iso,
    save_registry_entry,
)

REPORT_FILE = PROJECT_ROOT / "outputs" / "training_reports" / "latest_rul_training_report.json"


def load_failure_history_from_postgres() -> pd.DataFrame:
    import psycopg2

    conn = psycopg2.connect(
        host=os.getenv("POSTGRES_HOST", "localhost"),
        port=int(os.getenv("POSTGRES_PORT", "5432")),
        dbname=os.getenv("POSTGRES_DB", "supervision_moteur_db"),
        user=os.getenv("POSTGRES_USER", "postgres"),
        password=os.getenv("POSTGRES_PASSWORD", "samia"),
    )
    try:
        return pd.read_sql_query(
            """
            SELECT machine_id, failure_date, replaced_component, technician_diagnosis,
                   downtime_duration_minutes, repair_action, actual_root_cause, severity, notes
            FROM failure_history
            """,
            conn,
        )
    finally:
        conn.close()


def load_failure_history() -> pd.DataFrame:
    try:
        history = load_failure_history_from_postgres()
        if not history.empty:
            print(f"Loaded {len(history)} real failure rows from PostgreSQL.")
            return history
    except Exception as exc:
        print(f"PostgreSQL failure history unavailable: {exc}")

    csv_path = PROJECT_ROOT / "data" / "failure_history.csv"
    if csv_path.exists():
        history = pd.read_csv(csv_path)
        print(f"Loaded {len(history)} failure rows from {csv_path}.")
        return history

    print("No real failure history found; saving simulated proxy RUL artifact.")
    return pd.DataFrame()


def save_proxy_artifact(reason: str):
    artifact = {
        "model_name": "proxy_rul",
        "version": "simulated-1",
        "created_at": now_utc_iso(),
        "model": None,
        "feature_columns": FEATURE_COLUMNS,
        "simulated": True,
        "limitation": reason,
    }
    RUL_MODEL_FILE.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(artifact, RUL_MODEL_FILE)
    write_report(
        {
            "created_at": artifact["created_at"],
            "simulated": True,
            "reason": reason,
            "model_file": str(RUL_MODEL_FILE),
        }
    )
    save_registry_entry(
        {
            "model_name": "rul_model",
            "version": artifact["version"],
            "artifact_path": str(RUL_MODEL_FILE),
            "training_date": artifact["created_at"],
            "metrics": {},
            "status": "development",
            "simulated": True,
        }
    )


def write_report(report: dict[str, Any]):
    REPORT_FILE.parent.mkdir(parents=True, exist_ok=True)
    REPORT_FILE.write_text(json.dumps(report, indent=2), encoding="utf-8")


def main():
    if not CLEAN_DATASET_FILE.exists():
        raise FileNotFoundError(f"Sensor dataset not found: {CLEAN_DATASET_FILE}")

    sensor_df = pd.read_csv(CLEAN_DATASET_FILE)
    failure_history = load_failure_history()
    if failure_history.empty:
        save_proxy_artifact("No real failure history rows were available from PostgreSQL or ai/data/failure_history.csv.")
        return

    training_frame = build_rul_training_frame(sensor_df, failure_history)
    if len(training_frame) < 30:
        save_proxy_artifact("Insufficient joined sensor/failure rows for supervised RUL training.")
        return

    X = training_frame[FEATURE_COLUMNS]
    y = training_frame["time_to_failure_hours"].clip(lower=0.0, upper=24.0 * 365.0)
    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.20,
        random_state=42,
    )

    model = HistGradientBoostingRegressor(
        max_iter=250,
        learning_rate=0.05,
        max_leaf_nodes=31,
        l2_regularization=0.05,
        random_state=42,
    )
    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)
    metrics = {
        "mae_hours": float(mean_absolute_error(y_test, y_pred)),
        "r2": float(r2_score(y_test, y_pred)),
        "train_rows": int(len(X_train)),
        "test_rows": int(len(X_test)),
    }
    created_at = now_utc_iso()
    artifact = {
        "model_name": "rul_hist_gradient_boosting",
        "version": 1,
        "created_at": created_at,
        "model": model,
        "feature_columns": FEATURE_COLUMNS,
        "simulated": False,
        "validation_score": max(0.0, min(1.0, 1.0 - metrics["mae_hours"] / (24.0 * 30.0))),
        "metrics": metrics,
    }

    RUL_MODEL_FILE.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(artifact, RUL_MODEL_FILE)
    write_report(
        {
            "created_at": created_at,
            "model_file": str(RUL_MODEL_FILE),
            "simulated": False,
            "metrics": metrics,
            "feature_columns": FEATURE_COLUMNS,
        }
    )
    save_registry_entry(
        {
            "model_name": "rul_model",
            "version": artifact["version"],
            "artifact_path": str(RUL_MODEL_FILE),
            "training_date": created_at,
            "metrics": metrics,
            "status": "development",
            "simulated": False,
        }
    )
    print(f"RUL model saved to {RUL_MODEL_FILE}")
    print(json.dumps(metrics, indent=2))


if __name__ == "__main__":
    main()
