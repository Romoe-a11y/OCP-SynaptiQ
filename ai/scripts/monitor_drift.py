import argparse
import json
import sys
from pathlib import Path

import joblib
import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from maintenance_core import (
    CLEAN_DATASET_FILE,
    DRIFT_REPORT_FILE,
    FEATURE_COLUMNS,
    MODEL_FILE,
    build_time_series_features,
    compute_drift_report,
    normalize_model_artifact,
)


def parse_args():
    parser = argparse.ArgumentParser(description="Monitor predictive-maintenance feature drift.")
    parser.add_argument(
        "--input",
        type=Path,
        default=CLEAN_DATASET_FILE,
        help="CSV file to compare against the training baseline.",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=DRIFT_REPORT_FILE,
        help="JSON report output path.",
    )
    return parser.parse_args()


def main():
    args = parse_args()
    if not args.input.exists():
        raise FileNotFoundError(f"Fichier introuvable : {args.input}")
    if not MODEL_FILE.exists():
        raise FileNotFoundError(f"Modele introuvable : {MODEL_FILE}")

    artifact = normalize_model_artifact(joblib.load(MODEL_FILE))
    baseline_profile = artifact.get("baseline_profile")
    if not baseline_profile:
        raise ValueError("Le modele ne contient pas de baseline de drift. Relancez l'entrainement.")

    df = pd.read_csv(args.input)
    df = build_time_series_features(df)
    report = compute_drift_report(baseline_profile, df, artifact.get("feature_columns", FEATURE_COLUMNS))

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"Rapport de drift : {args.output}")
    print(f"Statut global : {report['status']}")
    for item in report["features"]:
        if item["status"] != "STABLE":
            print(f"- {item['feature']}: {item['status']} psi={item['psi']}")


if __name__ == "__main__":
    main()
