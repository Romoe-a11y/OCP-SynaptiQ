import json
import os
import sys
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
from sklearn.calibration import CalibratedClassifierCV
from sklearn.ensemble import HistGradientBoostingClassifier, IsolationForest
from sklearn.impute import SimpleImputer
from sklearn.inspection import permutation_importance
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
)
from sklearn.pipeline import Pipeline

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from maintenance_core import (
    FEATURE_COLUMNS,
    LABELED_DATASET_FILE,
    MODEL_FILE,
    RAW_FEATURE_COLUMNS,
    build_feature_profile,
    build_time_series_features,
    build_moment_anomaly_config,
    compute_moment_reconstruction_score,
    now_utc_iso,
    save_registry_entry,
)

TARGET_COLUMN = "diagnostic_label"
METRICS_DIR = PROJECT_ROOT / "outputs" / "training_reports"
MOMENT_CALIBRATION_WINDOWS = int(os.getenv("MOMENT_CALIBRATION_WINDOWS", "16"))


def load_training_frame() -> pd.DataFrame:
    if not LABELED_DATASET_FILE.exists():
        raise FileNotFoundError(f"Fichier introuvable : {LABELED_DATASET_FILE}")

    df = pd.read_csv(LABELED_DATASET_FILE)
    required_columns = RAW_FEATURE_COLUMNS + [TARGET_COLUMN]
    missing = [col for col in required_columns if col not in df.columns]
    if missing:
        raise ValueError(f"Colonnes manquantes : {missing}")

    for col in RAW_FEATURE_COLUMNS:
        df[col] = pd.to_numeric(df[col], errors="coerce")

    df = build_time_series_features(df)
    df = df.dropna(subset=FEATURE_COLUMNS + [TARGET_COLUMN]).copy()
    if df.empty:
        raise ValueError("Aucune ligne exploitable apres nettoyage.")

    if "horodatage" in df.columns:
        df["horodatage"] = pd.to_datetime(df["horodatage"], errors="coerce")

    return df


def time_based_split(df: pd.DataFrame, train_ratio: float = 0.8) -> tuple[pd.DataFrame, pd.DataFrame]:
    if "horodatage" in df.columns and df["horodatage"].notna().any():
        ordered = df.sort_values(["machine_id", "horodatage"]).reset_index(drop=True)
    else:
        ordered = df.reset_index(drop=True)

    split_index = int(len(ordered) * train_ratio)
    split_index = min(max(split_index, 1), len(ordered) - 1)
    return ordered.iloc[:split_index].copy(), ordered.iloc[split_index:].copy()


def train_diagnostic_classifier(
    X_train: pd.DataFrame,
    y_train: pd.Series,
    X_test: pd.DataFrame,
    y_test: pd.Series,
) -> tuple[Pipeline, dict[str, Any]]:
    if y_train.nunique() < 2:
        raise ValueError("Le modele supervise a besoin d'au moins deux classes.")

    base_model = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="median")),
            (
                "hist_gradient_boosting",
                HistGradientBoostingClassifier(
                    max_iter=250,
                    learning_rate=0.06,
                    max_leaf_nodes=31,
                    l2_regularization=0.05,
                    random_state=42,
                ),
            ),
        ]
    )
    min_class_count = int(y_train.value_counts().min())
    if min_class_count >= 3:
        model = CalibratedClassifierCV(base_model, method="sigmoid", cv=3)
    else:
        print("Calibration ignoree : moins de 3 exemples dans au moins une classe.")
        model = base_model

    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    metrics = {
        "accuracy": float(accuracy_score(y_test, y_pred)),
        "macro_precision": float(precision_score(y_test, y_pred, average="macro", zero_division=0)),
        "macro_recall": float(recall_score(y_test, y_pred, average="macro", zero_division=0)),
        "macro_f1": float(f1_score(y_test, y_pred, average="macro", zero_division=0)),
        "weighted_f1": float(f1_score(y_test, y_pred, average="weighted", zero_division=0)),
    }

    print("Diagnostic classifier metrics :")
    for key, value in metrics.items():
        print(f"{key}: {round(value, 4)}")
    print()
    print("Diagnostic classification report :")
    report_text = classification_report(y_test, y_pred, zero_division=0)
    print(report_text)
    print()
    print("Diagnostic confusion matrix :")
    classes = list(getattr(model, "classes_", sorted(y_train.unique())))
    matrix = confusion_matrix(y_test, y_pred, labels=classes)
    print(matrix)
    print()

    metrics["classification_report"] = classification_report(
        y_test,
        y_pred,
        output_dict=True,
        zero_division=0,
    )
    metrics["confusion_matrix"] = matrix.tolist()
    metrics["classes"] = classes
    metrics["model_type"] = "Calibrated HistGradientBoostingClassifier" if isinstance(model, CalibratedClassifierCV) else "HistGradientBoostingClassifier"
    return model, metrics


def train_anomaly_detector(
    X_train: pd.DataFrame,
    y_train: pd.Series,
    X_test: pd.DataFrame,
    y_test: pd.Series,
) -> tuple[Pipeline, dict[str, float], float, dict[str, Any]]:
    normal_mask = y_train.eq("NORMAL")
    normal_X = X_train.loc[normal_mask]
    fit_X = normal_X if len(normal_X) >= 100 else X_train

    anomaly_ratio = float((~normal_mask).mean())
    contamination = float(np.clip(anomaly_ratio, 0.005, 0.20))

    model = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="median")),
            (
                "isolation_forest",
                IsolationForest(
                    n_estimators=400,
                    contamination=contamination,
                    random_state=42,
                    n_jobs=-1,
                ),
            ),
        ]
    )
    model.fit(fit_X)

    train_scores = model.decision_function(X_train)
    quantiles = {
        "p01": float(np.quantile(train_scores, 0.01)),
        "p05": float(np.quantile(train_scores, 0.05)),
        "p50": float(np.quantile(train_scores, 0.50)),
        "p95": float(np.quantile(train_scores, 0.95)),
    }

    predicted_anomaly = model.predict(X_test) == -1
    true_anomaly = ~y_test.eq("NORMAL")
    report = classification_report(
        true_anomaly,
        predicted_anomaly,
        target_names=["normal", "anomaly"],
        output_dict=True,
        zero_division=0,
    )
    print("Isolation Forest anomaly report :")
    print(
        classification_report(
            true_anomaly,
            predicted_anomaly,
            target_names=["normal", "anomaly"],
            zero_division=0,
        )
    )
    print("Isolation Forest contamination :", round(contamination, 4))
    print("Isolation Forest score quantiles :", quantiles)
    print()

    metrics = {
        "anomaly_precision": float(report["anomaly"]["precision"]),
        "anomaly_recall": float(report["anomaly"]["recall"]),
        "anomaly_f1": float(report["anomaly"]["f1-score"]),
        "anomaly_accuracy": float(report["accuracy"]),
        "classification_report": report,
    }
    return model, quantiles, contamination, metrics


def select_moment_calibration_windows(
    train_df: pd.DataFrame,
    max_windows: int,
) -> list[pd.DataFrame]:
    if max_windows <= 0:
        return []

    normal_rows = train_df[train_df[TARGET_COLUMN].eq("NORMAL")]
    if normal_rows.empty:
        normal_rows = train_df

    sample_count = min(max_windows, len(normal_rows))
    sampled_indexes = (
        normal_rows.sample(n=sample_count, random_state=42)
        .sort_index()
        .index
        .tolist()
    )

    windows = []
    for index in sampled_indexes:
        start_index = max(0, int(index) - 511)
        windows.append(train_df.loc[start_index:index, FEATURE_COLUMNS].copy())

    return windows


def calibrate_moment_anomaly_model(
    train_df: pd.DataFrame,
    baseline_profile: dict[str, Any],
) -> tuple[dict[str, Any], dict[str, Any]]:
    config = build_moment_anomaly_config(baseline_profile)
    windows = select_moment_calibration_windows(train_df, MOMENT_CALIBRATION_WINDOWS)
    errors: list[float] = []
    first_error: str | None = None

    for window in windows:
        assessment = compute_moment_reconstruction_score(window, config)
        if not assessment.get("enabled"):
            first_error = str(assessment.get("error") or "MOMENT indisponible")
            break
        errors.append(float(assessment["reconstruction_error"]))

    metrics: dict[str, Any] = {
        "engine": "MOMENT",
        "model_id": config["model_id"],
        "task_name": config["task_name"],
        "calibration_windows_requested": MOMENT_CALIBRATION_WINDOWS,
        "calibration_windows_used": len(errors),
        "calibrated": bool(errors),
    }

    if errors:
        quantiles = {
            "p50": float(np.quantile(errors, 0.50)),
            "p75": float(np.quantile(errors, 0.75)),
            "p95": float(np.quantile(errors, 0.95)),
            "p99": float(np.quantile(errors, 0.99)),
        }
        config["score_quantiles"] = quantiles
        metrics["score_quantiles"] = quantiles
        metrics["mean_reconstruction_error"] = float(np.mean(errors))
        metrics["max_reconstruction_error"] = float(np.max(errors))
    else:
        metrics["warning"] = (
            first_error
            or "Aucune fenetre de calibration MOMENT disponible; seuils heuristiques utilises."
        )

    print("MOMENT anomaly configuration :")
    print(json.dumps(metrics, indent=2))
    print()
    return config, metrics


def try_start_mlflow():
    try:
        import mlflow
    except ImportError:
        print("MLflow non installe : suivi d'experience ignore.")
        return None, None

    mlflow.set_tracking_uri((PROJECT_ROOT / "mlruns").as_uri())
    mlflow.set_experiment("predictive-maintenance")
    return mlflow, mlflow.start_run(run_name=f"training-{now_utc_iso()}")


def log_mlflow(
    mlflow,
    diagnostic_metrics: dict[str, Any],
    anomaly_metrics: dict[str, Any],
    moment_metrics: dict[str, Any],
    artifact_path: Path,
    report_path: Path,
):
    if mlflow is None:
        return

    flat_metrics = {
        key: value
        for key, value in {**diagnostic_metrics, **anomaly_metrics, **moment_metrics}.items()
        if isinstance(value, (int, float))
    }
    mlflow.log_params(
        {
            "feature_count": len(FEATURE_COLUMNS),
            "diagnostic_model": "RandomForestClassifier",
            "anomaly_model": "MOMENTReconstruction",
            "anomaly_fallback_model": "IsolationForest",
            "moment_model_id": moment_metrics.get("model_id"),
            "validation": "time_based_80_20",
        }
    )
    mlflow.log_metrics(flat_metrics)
    mlflow.log_artifact(str(report_path), artifact_path="reports")
    mlflow.log_artifact(str(artifact_path), artifact_path="models")


def main():
    df = load_training_frame()
    train_df, test_df = time_based_split(df)
    X_train = train_df[FEATURE_COLUMNS]
    y_train = train_df[TARGET_COLUMN]
    X_test = test_df[FEATURE_COLUMNS]
    y_test = test_df[TARGET_COLUMN]

    print("Repartition des classes - train :")
    print(y_train.value_counts())
    print()
    print("Repartition des classes - test chronologique :")
    print(y_test.value_counts())
    print()

    diagnostic_model, diagnostic_metrics = train_diagnostic_classifier(
        X_train,
        y_train,
        X_test,
        y_test,
    )
    anomaly_model, quantiles, contamination, anomaly_metrics = train_anomaly_detector(
        X_train,
        y_train,
        X_test,
        y_test,
    )

    baseline_profile = build_feature_profile(train_df, FEATURE_COLUMNS)
    moment_anomaly_config, moment_metrics = calibrate_moment_anomaly_model(
        train_df,
        baseline_profile,
    )
    bundle = {
        "version": 5,
        "model_name": "diagnostic_model",
        "created_at": now_utc_iso(),
        "feature_columns": FEATURE_COLUMNS,
        "raw_feature_columns": RAW_FEATURE_COLUMNS,
        "diagnostic_model": diagnostic_model,
        "moment_anomaly_model": moment_anomaly_config,
        "anomaly_model": anomaly_model,
        "anomaly_score_quantiles": quantiles,
        "anomaly_contamination": contamination,
        "diagnostic_classes": list(getattr(diagnostic_model, "classes_", [])),
        "training_validation": "time_based_80_20",
        "probability_calibration": {
            "enabled": isinstance(diagnostic_model, CalibratedClassifierCV),
            "method": "sigmoid",
        },
        "training_metrics": {
            "diagnostic": diagnostic_metrics,
            "anomaly": anomaly_metrics,
            "moment_anomaly": moment_metrics,
        },
        "baseline_profile": baseline_profile,
    }

    MODEL_FILE.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(bundle, MODEL_FILE)
    print(f"Modele sauvegarde dans : {MODEL_FILE}")

    permutation = permutation_importance(
        diagnostic_model,
        X_test,
        y_test,
        n_repeats=5,
        random_state=42,
        n_jobs=-1,
        scoring="f1_macro",
    )
    importances = pd.DataFrame(
        {
            "feature": FEATURE_COLUMNS,
            "importance": permutation.importances_mean,
        }
    ).sort_values(by="importance", ascending=False)

    report = {
        "created_at": bundle["created_at"],
        "model_file": str(MODEL_FILE),
        "train_rows": int(len(train_df)),
        "test_rows": int(len(test_df)),
        "feature_columns": FEATURE_COLUMNS,
        "diagnostic_metrics": diagnostic_metrics,
        "anomaly_metrics": anomaly_metrics,
        "moment_anomaly_metrics": moment_metrics,
        "feature_importance": importances.to_dict(orient="records"),
    }
    METRICS_DIR.mkdir(parents=True, exist_ok=True)
    report_path = METRICS_DIR / "latest_training_report.json"
    report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")

    print()
    print("Importance des variables du diagnostic supervise :")
    print(importances.head(20))
    print(f"Rapport d'entrainement : {report_path}")

    mlflow, run = try_start_mlflow()
    if run is not None:
        with run:
            log_mlflow(
                mlflow,
                diagnostic_metrics,
                anomaly_metrics,
                moment_metrics,
                MODEL_FILE,
                report_path,
            )
            print("MLflow run :", run.info.run_id)

    save_registry_entry(
        {
            "model_name": "diagnostic_model",
            "version": bundle["version"],
            "artifact_path": str(MODEL_FILE),
            "training_date": bundle["created_at"],
            "metrics": {
                "macro_f1": diagnostic_metrics.get("macro_f1"),
                "weighted_f1": diagnostic_metrics.get("weighted_f1"),
                "anomaly_f1": anomaly_metrics.get("anomaly_f1"),
            },
            "status": "development",
            "registry": "lightweight-json",
        }
    )


if __name__ == "__main__":
    main()
