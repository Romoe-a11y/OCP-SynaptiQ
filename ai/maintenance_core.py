from __future__ import annotations

from datetime import datetime, timezone
from functools import lru_cache
from pathlib import Path
from typing import Any, Mapping

import numpy as np
import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parent
DATA_DIR = PROJECT_ROOT / "data"
MODELS_DIR = PROJECT_ROOT / "models"
OUTPUTS_DIR = PROJECT_ROOT / "outputs"

RAW_DATASET_FILE = DATA_DIR / "EV_Predictive_Maintenance_Dataset_15min.csv"
CLEAN_DATASET_FILE = DATA_DIR / "dataset_supervision_moteur_clean.csv"
LABELED_DATASET_FILE = DATA_DIR / "dataset_supervision_moteur_labeled.csv"
MODEL_FILE = MODELS_DIR / "diagnostic_model.pkl"
RUL_MODEL_FILE = MODELS_DIR / "rul_model.pkl"
DRIFT_REPORT_FILE = OUTPUTS_DIR / "drift_report.json"
MODEL_REGISTRY_FILE = OUTPUTS_DIR / "model_registry.json"
MOMENT_MODEL_ID = "AutonLab/MOMENT-1-large"
MOMENT_WINDOW_SIZE = 512
RAW_FEATURE_COLUMNS = [
    "temperature",
    "courant",
    "vibration",
    "couple",
    "rpm",
    "failure_probability",
    "component_health_score",
]
MOMENT_ANOMALY_FEATURE_COLUMNS = list(RAW_FEATURE_COLUMNS)

TIME_SERIES_FEATURE_COLUMNS = [
    "courant_abs",
    "temperature_mean_1h",
    "temperature_mean_6h",
    "temperature_mean_24h",
    "temperature_delta_1h",
    "vibration_mean_1h",
    "vibration_mean_6h",
    "vibration_mean_24h",
    "vibration_std_1h",
    "vibration_delta_1h",
    "rpm_mean_1h",
    "rpm_mean_6h",
    "rpm_mean_24h",
    "rpm_std_1h",
    "rpm_delta_1h",
    "courant_abs_mean_1h",
    "courant_abs_mean_6h",
    "courant_abs_mean_24h",
    "courant_spike_1h",
    "health_degradation_6h",
    "health_degradation_24h",
    "failure_probability_delta_1h",
    "failure_probability_mean_24h",
    "load_index",
]

FEATURE_COLUMNS = RAW_FEATURE_COLUMNS + TIME_SERIES_FEATURE_COLUMNS

DIAGNOSTIC_DETAILS = {
    "normal": {
        "cause_probable": "No known failure window from maintenance history",
        "recommandation": "Continue normal monitoring",
        "decision": "SURVEILLANCE",
    },
    "warning": {
        "cause_probable": "Machine is inside a learned warning horizon before a recorded failure",
        "recommandation": "Schedule inspection and compare with similar pre-failure windows",
        "decision": "MAINTENANCE_PLANIFIEE",
    },
    "critical": {
        "cause_probable": "Machine is inside a learned critical horizon before a recorded failure",
        "recommandation": "Prioritize intervention and prepare spare parts",
        "decision": "INTERVENTION_URGENTE",
    },
    "failure": {
        "cause_probable": "Measurement is aligned with a recorded failure event",
        "recommandation": "Stop or isolate the machine and execute repair workflow",
        "decision": "ARRET_RECOMMANDE",
    },
    "SURCHAUFFE_PROBABLE": {
        "cause_probable": "Probleme de refroidissement ou surcharge thermique",
        "recommandation": "Verifier le systeme de refroidissement et la charge appliquee",
        "decision": "INTERVENTION_URGENTE",
    },
    "USURE_MECANIQUE_PROBABLE": {
        "cause_probable": "Usure mecanique probable ou desalignement",
        "recommandation": "Inspecter les roulements et verifier l'alignement mecanique",
        "decision": "MAINTENANCE_PLANIFIEE",
    },
    "SURCHARGE_ELECTRIQUE_PROBABLE": {
        "cause_probable": "Effort moteur excessif ou alimentation anormale",
        "recommandation": "Controler l'alimentation electrique et reduire la charge",
        "decision": "INTERVENTION_URGENTE",
    },
    "FROTTEMENT_OU_BLOCAGE_PROBABLE": {
        "cause_probable": "Resistance mecanique excessive ou blocage partiel",
        "recommandation": "Inspecter les composants mobiles et rechercher un blocage",
        "decision": "ARRET_RECOMMANDE",
    },
    "DESEQUILIBRE_ROTATION_PROBABLE": {
        "cause_probable": "Instabilite de rotation, balourd ou variation RPM anormale",
        "recommandation": "Controler l'equilibrage, l'arbre moteur et la stabilite de vitesse",
        "decision": "MAINTENANCE_PLANIFIEE",
    },
    "DEFAILLANCE_CAPTEUR_PROBABLE": {
        "cause_probable": "Mesure incoherente ou capteur potentiellement defaillant",
        "recommandation": "Verifier le cablage, recalibrer le capteur et comparer avec une mesure manuelle",
        "decision": "INSPECTION_PRIORITAIRE",
    },
    "ETAT_CRITIQUE_GENERAL": {
        "cause_probable": "Degradation avancee de l'etat de fonctionnement",
        "recommandation": "Planifier une inspection complete de la machine",
        "decision": "ARRET_RECOMMANDE",
    },
    "ANOMALIE_ISOLATION_FOREST": {
        "cause_probable": "Comportement multidimensionnel inhabituel detecte par Isolation Forest",
        "recommandation": "Inspecter la machine et comparer les capteurs aux valeurs historiques normales",
        "decision": "INSPECTION_PRIORITAIRE",
    },
    "ANOMALIE_MOMENT": {
        "cause_probable": "Comportement temporel inhabituel detecte par MOMENT",
        "recommandation": "Comparer la fenetre recente aux mesures historiques et inspecter les capteurs concernes",
        "decision": "INSPECTION_PRIORITAIRE",
    },
    "NORMAL": {
        "cause_probable": "Aucune cause anormale significative detectee",
        "recommandation": "Poursuivre la surveillance normale",
        "decision": "SURVEILLANCE",
    },
    "DIAGNOSTIC_INCONNU": {
        "cause_probable": "Cause non determinee",
        "recommandation": "Verifier les mesures et relancer le diagnostic",
        "decision": "SURVEILLANCE",
    },
}


def _as_float(value: Any, default: float = 0.0) -> float:
    if value is None or pd.isna(value):
        return default
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _safe_std(value: Any, default: float = 1.0) -> float:
    std = _as_float(value, default=default)
    if not np.isfinite(std) or std <= 1e-9:
        return default
    return std


def build_time_series_features(df: pd.DataFrame) -> pd.DataFrame:
    data = df.copy()
    if data.empty:
        return data

    if "machine_id" not in data.columns:
        data["machine_id"] = 1

    if "horodatage" in data.columns:
        data["horodatage"] = pd.to_datetime(data["horodatage"], errors="coerce")
        sort_columns = ["machine_id", "horodatage"]
    else:
        data["_row_order"] = np.arange(len(data))
        sort_columns = ["machine_id", "_row_order"]

    for column in RAW_FEATURE_COLUMNS:
        if column not in data.columns:
            data[column] = np.nan
        data[column] = pd.to_numeric(data[column], errors="coerce")

    data = data.sort_values(sort_columns).reset_index(drop=True)
    group = data.groupby("machine_id", group_keys=False, sort=False)

    data["courant_abs"] = data["courant"].abs()
    data["temperature_mean_1h"] = group["temperature"].transform(
        lambda values: values.rolling(window=4, min_periods=1).mean()
    )
    data["temperature_mean_6h"] = group["temperature"].transform(
        lambda values: values.rolling(window=24, min_periods=1).mean()
    )
    data["temperature_mean_24h"] = group["temperature"].transform(
        lambda values: values.rolling(window=96, min_periods=1).mean()
    )
    data["temperature_delta_1h"] = group["temperature"].diff(4).fillna(0.0)
    data["vibration_mean_1h"] = group["vibration"].transform(
        lambda values: values.rolling(window=4, min_periods=1).mean()
    )
    data["vibration_mean_6h"] = group["vibration"].transform(
        lambda values: values.rolling(window=24, min_periods=1).mean()
    )
    data["vibration_mean_24h"] = group["vibration"].transform(
        lambda values: values.rolling(window=96, min_periods=1).mean()
    )
    data["vibration_std_1h"] = (
        group["vibration"]
        .transform(lambda values: values.rolling(window=4, min_periods=2).std())
        .fillna(0.0)
    )
    data["vibration_delta_1h"] = group["vibration"].diff(4).fillna(0.0)
    data["rpm_mean_1h"] = group["rpm"].transform(
        lambda values: values.rolling(window=4, min_periods=1).mean()
    )
    data["rpm_mean_6h"] = group["rpm"].transform(
        lambda values: values.rolling(window=24, min_periods=1).mean()
    )
    data["rpm_mean_24h"] = group["rpm"].transform(
        lambda values: values.rolling(window=96, min_periods=1).mean()
    )
    data["rpm_std_1h"] = (
        group["rpm"]
        .transform(lambda values: values.rolling(window=4, min_periods=2).std())
        .fillna(0.0)
    )
    data["rpm_delta_1h"] = group["rpm"].diff(4).fillna(0.0)
    data["courant_abs_mean_1h"] = group["courant_abs"].transform(
        lambda values: values.rolling(window=4, min_periods=1).mean()
    )
    data["courant_abs_mean_6h"] = group["courant_abs"].transform(
        lambda values: values.rolling(window=24, min_periods=1).mean()
    )
    data["courant_abs_mean_24h"] = group["courant_abs"].transform(
        lambda values: values.rolling(window=96, min_periods=1).mean()
    )
    data["courant_spike_1h"] = data["courant_abs"] - data["courant_abs_mean_1h"]
    data["health_degradation_6h"] = (
        group["component_health_score"].shift(24) - data["component_health_score"]
    ).fillna(0.0)
    data["health_degradation_24h"] = (
        group["component_health_score"].shift(96) - data["component_health_score"]
    ).fillna(0.0)
    data["failure_probability_delta_1h"] = (
        group["failure_probability"].diff(4).fillna(0.0)
    )
    data["failure_probability_mean_24h"] = group["failure_probability"].transform(
        lambda values: values.rolling(window=96, min_periods=1).mean()
    )
    data["load_index"] = (data["courant_abs"] * data["couple"]) / 1000.0

    for column in TIME_SERIES_FEATURE_COLUMNS:
        data[column] = pd.to_numeric(data[column], errors="coerce").replace(
            [np.inf, -np.inf],
            np.nan,
        )

    if "_row_order" in data.columns:
        data = data.drop(columns=["_row_order"])

    return data


def ensure_feature_columns(df: pd.DataFrame) -> pd.DataFrame:
    data = df.copy()
    missing_time_features = [col for col in TIME_SERIES_FEATURE_COLUMNS if col not in data]
    empty_time_features = [
        col for col in TIME_SERIES_FEATURE_COLUMNS if col in data and data[col].isna().all()
    ]
    if missing_time_features or empty_time_features:
        data = build_time_series_features(data)

    for column in FEATURE_COLUMNS:
        if column not in data.columns:
            data[column] = np.nan
        data[column] = pd.to_numeric(data[column], errors="coerce")

    return data


def get_cause_probable(label: str) -> str:
    return DIAGNOSTIC_DETAILS.get(label, DIAGNOSTIC_DETAILS["DIAGNOSTIC_INCONNU"])[
        "cause_probable"
    ]


def get_recommandation(label: str) -> str:
    return DIAGNOSTIC_DETAILS.get(label, DIAGNOSTIC_DETAILS["DIAGNOSTIC_INCONNU"])[
        "recommandation"
    ]


def get_decision(label: str) -> str:
    return DIAGNOSTIC_DETAILS.get(label, DIAGNOSTIC_DETAILS["DIAGNOSTIC_INCONNU"])[
        "decision"
    ]


def get_diagnostic_label(row: Mapping[str, Any]) -> str:
    temp = _as_float(row.get("temperature"))
    courant = abs(_as_float(row.get("courant_abs", row.get("courant"))))
    vibration = _as_float(row.get("vibration"))
    rpm = _as_float(row.get("rpm"))
    failure_prob = _as_float(row.get("failure_probability"))
    health = _as_float(row.get("component_health_score"), default=1.0)
    score = _as_float(row.get("score_anomalie"))
    niveau_risque = str(row.get("niveau_risque", "")).strip().upper()
    temp_delta = _as_float(row.get("temperature_delta_1h"))
    vib_delta = _as_float(row.get("vibration_delta_1h"))
    rpm_delta = _as_float(row.get("rpm_delta_1h"))
    rpm_std = _as_float(row.get("rpm_std_1h"))
    current_spike = _as_float(row.get("courant_spike_1h"))
    health_degradation = _as_float(row.get("health_degradation_6h"))
    load_index = _as_float(row.get("load_index"))

    if health <= 0.03 and failure_prob <= 0.05 and temp < 65 and vibration < 0.8:
        return "DEFAILLANCE_CAPTEUR_PROBABLE"

    if temp >= 85 and (failure_prob >= 0.45 or temp_delta >= 8):
        return "SURCHAUFFE_PROBABLE"

    if vibration >= 1.2 and (health <= 0.60 or vib_delta >= 0.35):
        return "USURE_MECANIQUE_PROBABLE"

    if courant >= 120 and (temp >= 70 or current_spike >= 35 or load_index >= 25):
        return "SURCHARGE_ELECTRIQUE_PROBABLE"

    if rpm <= 1550 and courant >= 80 and (vibration >= 0.9 or load_index >= 18):
        return "FROTTEMENT_OU_BLOCAGE_PROBABLE"

    if rpm_std >= 750 or abs(rpm_delta) >= 1500:
        return "DESEQUILIBRE_ROTATION_PROBABLE"

    if health_degradation >= 0.25 and failure_prob >= 0.20:
        return "USURE_MECANIQUE_PROBABLE"

    if score >= 45 or niveau_risque == "CRITIQUE":
        return "ETAT_CRITIQUE_GENERAL"

    return "NORMAL"


def add_diagnostic_metadata(df: pd.DataFrame, label_column: str = "diagnostic_label") -> pd.DataFrame:
    df["cause_probable"] = df[label_column].apply(get_cause_probable)
    df["recommandation"] = df[label_column].apply(get_recommandation)
    df["decision"] = df[label_column].apply(get_decision)
    return df


def normalize_failure_history(failure_history: pd.DataFrame | None) -> pd.DataFrame:
    if failure_history is None or failure_history.empty:
        return pd.DataFrame(columns=["machine_id", "failure_date"])

    history = failure_history.copy()
    rename_map = {
        "motor_id": "machine_id",
        "motorId": "machine_id",
        "machineId": "machine_id",
        "date_panne": "failure_date",
        "failureDate": "failure_date",
    }
    history = history.rename(columns={k: v for k, v in rename_map.items() if k in history.columns})

    required = ["machine_id", "failure_date"]
    missing = [column for column in required if column not in history.columns]
    if missing:
        raise ValueError(f"Failure history missing required columns: {missing}")

    history["machine_id"] = pd.to_numeric(history["machine_id"], errors="coerce")
    history["failure_date"] = pd.to_datetime(history["failure_date"], errors="coerce")
    history = history.dropna(subset=["machine_id", "failure_date"]).copy()
    history["machine_id"] = history["machine_id"].astype(int)
    return history.sort_values(["machine_id", "failure_date"]).reset_index(drop=True)


def add_failure_supervision_labels(
    sensor_df: pd.DataFrame,
    failure_history: pd.DataFrame | None,
    warning_horizon_hours: float = 168.0,
    critical_horizon_hours: float = 24.0,
    failure_window_hours: float = 1.0,
) -> pd.DataFrame:
    """Attach real failure labels and time-to-failure targets from maintenance records.

    Rows are labelled by the next known failure for the same machine. If no real
    failure history is available, existing labels are preserved and RUL remains null.
    """

    data = sensor_df.copy()
    if data.empty:
        return data

    if "machine_id" not in data.columns:
        data["machine_id"] = 1
    if "horodatage" not in data.columns:
        data["horodatage"] = pd.date_range("2024-01-01", periods=len(data), freq="15min")

    data["machine_id"] = pd.to_numeric(data["machine_id"], errors="coerce").fillna(1).astype(int)
    data["horodatage"] = pd.to_datetime(data["horodatage"], errors="coerce")
    data = data.dropna(subset=["horodatage"]).sort_values(["machine_id", "horodatage"]).reset_index(drop=True)

    history = normalize_failure_history(failure_history)
    if history.empty:
        data["supervised_label_source"] = "rule_or_unlabeled"
        if "supervised_label" not in data.columns:
            data["supervised_label"] = data.get("target_label", data.get("diagnostic_label", "normal"))
        data["time_to_failure_hours"] = np.nan
        return data

    labelled_frames: list[pd.DataFrame] = []
    for machine_id, machine_rows in data.groupby("machine_id", sort=False):
        machine_failures = history[history["machine_id"].eq(machine_id)][["failure_date"]].copy()
        rows = machine_rows.sort_values("horodatage").copy()
        if machine_failures.empty:
            rows["time_to_failure_hours"] = np.nan
            rows["supervised_label"] = "normal"
            rows["supervised_label_source"] = "real_failure_history"
            labelled_frames.append(rows)
            continue

        merged = pd.merge_asof(
            rows,
            machine_failures.sort_values("failure_date"),
            left_on="horodatage",
            right_on="failure_date",
            direction="forward",
        )
        merged["time_to_failure_hours"] = (
            (merged["failure_date"] - merged["horodatage"]).dt.total_seconds() / 3600.0
        )

        labels = np.full(len(merged), "normal", dtype=object)
        ttf = merged["time_to_failure_hours"]
        labels[(ttf.notna()) & (ttf <= warning_horizon_hours)] = "warning"
        labels[(ttf.notna()) & (ttf <= critical_horizon_hours)] = "critical"
        labels[(ttf.notna()) & (ttf <= failure_window_hours)] = "failure"
        merged["supervised_label"] = labels
        merged["supervised_label_source"] = "real_failure_history"
        labelled_frames.append(merged)

    return pd.concat(labelled_frames, ignore_index=True).sort_values(["machine_id", "horodatage"])


def build_rul_training_frame(
    sensor_df: pd.DataFrame,
    failure_history: pd.DataFrame | None,
) -> pd.DataFrame:
    labelled = add_failure_supervision_labels(sensor_df, failure_history)
    featured = ensure_feature_columns(labelled)
    if "time_to_failure_hours" not in featured.columns:
        featured["time_to_failure_hours"] = np.nan
    return featured.dropna(subset=FEATURE_COLUMNS + ["time_to_failure_hours"]).copy()


def validate_payload(data: Mapping[str, Any] | None) -> tuple[bool, str | None]:
    if not isinstance(data, Mapping):
        return False, "Corps JSON vide ou invalide"

    missing = [col for col in RAW_FEATURE_COLUMNS if col not in data]
    if missing:
        return False, f"Champs manquants : {missing}"

    return True, None


def dataframe_from_payload(data: Mapping[str, Any]) -> pd.DataFrame:
    rows: list[dict[str, Any]] = []
    history = data.get("history", [])
    if isinstance(history, list):
        for item in history:
            if isinstance(item, Mapping):
                rows.append(dict(item))

    current_row = {column: float(data[column]) for column in RAW_FEATURE_COLUMNS}
    current_row["machine_id"] = data.get("machine_id", 1)
    if data.get("horodatage") is not None:
        current_row["horodatage"] = data.get("horodatage")
    rows.append(current_row)

    return ensure_feature_columns(pd.DataFrame(rows)).tail(1)[FEATURE_COLUMNS]


def normalize_model_artifact(artifact: Any) -> dict[str, Any]:
    if isinstance(artifact, dict) and (
        "diagnostic_model" in artifact
        or "anomaly_model" in artifact
        or "moment_anomaly_model" in artifact
    ):
        artifact.setdefault("version", 2)
        artifact.setdefault("feature_columns", FEATURE_COLUMNS)
        artifact.setdefault("diagnostic_model", None)
        artifact.setdefault("anomaly_model", None)
        artifact.setdefault(
            "moment_anomaly_model",
            build_moment_anomaly_config(artifact.get("baseline_profile"))
            if artifact.get("baseline_profile")
            else None,
        )
        artifact.setdefault("created_at", None)
        return artifact

    return {
        "version": 1,
        "created_at": None,
        "feature_columns": RAW_FEATURE_COLUMNS,
        "diagnostic_model": artifact,
        "anomaly_model": None,
        "moment_anomaly_model": None,
        "anomaly_score_quantiles": None,
    }


def load_model_artifact(model_file: str | Path = MODEL_FILE) -> dict[str, Any]:
    import joblib

    model_path = Path(model_file)
    if not model_path.exists():
        raise FileNotFoundError(f"Modele introuvable : {model_file}")
    return normalize_model_artifact(joblib.load(model_path))


def now_utc_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def build_feature_profile(
    df: pd.DataFrame,
    features: list[str] | None = None,
    bins: int = 10,
) -> dict[str, Any]:
    features = features or FEATURE_COLUMNS
    data = ensure_feature_columns(df)
    profile: dict[str, Any] = {
        "created_at": now_utc_iso(),
        "row_count": int(len(data)),
        "features": {},
    }

    for feature in features:
        values = pd.to_numeric(data[feature], errors="coerce").dropna()
        if values.empty:
            continue

        quantiles = np.linspace(0.0, 1.0, bins + 1)
        edges = np.unique(np.quantile(values, quantiles))
        if len(edges) < 3:
            low = float(values.min())
            high = float(values.max())
            if low == high:
                low -= 0.5
                high += 0.5
            edges = np.linspace(low, high, bins + 1)

        histogram_edges = np.concatenate(([-np.inf], edges[1:-1], [np.inf]))
        counts, _ = np.histogram(values, bins=histogram_edges)
        distribution = (counts / max(counts.sum(), 1)).astype(float)

        profile["features"][feature] = {
            "mean": float(values.mean()),
            "std": float(values.std(ddof=0)),
            "missing_rate": float(data[feature].isna().mean()),
            "bin_edges": histogram_edges.tolist(),
            "distribution": distribution.tolist(),
        }

    return profile


def population_stability_index(
    expected: list[float],
    actual: list[float],
    epsilon: float = 1e-6,
) -> float:
    expected_array = np.asarray(expected, dtype=float) + epsilon
    actual_array = np.asarray(actual, dtype=float) + epsilon
    return float(np.sum((actual_array - expected_array) * np.log(actual_array / expected_array)))


def compute_drift_report(
    reference_profile: Mapping[str, Any],
    current_df: pd.DataFrame,
    features: list[str] | None = None,
) -> dict[str, Any]:
    features = features or FEATURE_COLUMNS
    data = ensure_feature_columns(current_df)
    feature_reports = []

    for feature in features:
        reference = reference_profile.get("features", {}).get(feature)
        if not reference:
            continue

        values = pd.to_numeric(data[feature], errors="coerce").dropna()
        if values.empty:
            feature_reports.append(
                {
                    "feature": feature,
                    "psi": None,
                    "status": "NO_CURRENT_DATA",
                    "current_missing_rate": 1.0,
                }
            )
            continue

        counts, _ = np.histogram(values, bins=np.asarray(reference["bin_edges"], dtype=float))
        actual_distribution = (counts / max(counts.sum(), 1)).astype(float).tolist()
        psi = population_stability_index(reference["distribution"], actual_distribution)

        if psi >= 0.25:
            status = "DRIFT"
        elif psi >= 0.10:
            status = "WATCH"
        else:
            status = "OK"

        feature_reports.append(
            {
                "feature": feature,
                "psi": round(psi, 6),
                "status": status,
                "reference_mean": reference["mean"],
                "current_mean": float(values.mean()),
                "reference_missing_rate": reference["missing_rate"],
                "current_missing_rate": float(data[feature].isna().mean()),
            }
        )

    worst_status = "OK"
    if any(item["status"] == "DRIFT" for item in feature_reports):
        worst_status = "DRIFT"
    elif any(item["status"] == "WATCH" for item in feature_reports):
        worst_status = "WATCH"

    return {
        "created_at": now_utc_iso(),
        "status": worst_status,
        "row_count": int(len(data)),
        "reference_row_count": int(reference_profile.get("row_count", 0)),
        "features": feature_reports,
    }


def anomaly_risk_from_decision(
    decision_score: float,
    quantiles: Mapping[str, float] | None,
) -> float:
    if quantiles:
        points = np.array(
            [
                float(quantiles.get("p01", -0.20)),
                float(quantiles.get("p05", -0.10)),
                float(quantiles.get("p50", 0.00)),
                float(quantiles.get("p95", 0.20)),
            ]
        )

        if np.all(np.diff(points) > 0):
            risk = np.interp(decision_score, points, [100.0, 85.0, 35.0, 0.0])
            return round(float(np.clip(risk, 0.0, 100.0)), 2)

    safe_score = float(np.clip(decision_score, -1.0, 1.0))
    risk = 100.0 / (1.0 + np.exp(12.0 * safe_score))
    return round(float(np.clip(risk, 0.0, 100.0)), 2)


def moment_risk_from_error(
    reconstruction_error: float,
    quantiles: Mapping[str, float] | None,
) -> float:
    if quantiles:
        points = np.array(
            [
                float(quantiles.get("p50", 0.05)),
                float(quantiles.get("p75", 0.15)),
                float(quantiles.get("p95", 0.40)),
                float(quantiles.get("p99", 0.80)),
            ]
        )

        if np.all(np.diff(points) > 0):
            risk = np.interp(reconstruction_error, points, [10.0, 35.0, 75.0, 100.0])
            return round(float(np.clip(risk, 0.0, 100.0)), 2)

    safe_error = float(np.clip(reconstruction_error, 0.0, 10.0))
    risk = 100.0 * (1.0 - np.exp(-safe_error))
    return round(float(np.clip(risk, 0.0, 100.0)), 2)


def anomaly_severity(risk_score: float) -> str:
    if risk_score >= 85:
        return "CRITIQUE"
    if risk_score >= 65:
        return "ELEVEE"
    if risk_score >= 40:
        return "MOYENNE"
    return "FAIBLE"


def build_moment_anomaly_config(
    baseline_profile: Mapping[str, Any] | None,
    score_quantiles: Mapping[str, float] | None = None,
    model_id: str = MOMENT_MODEL_ID,
    feature_columns: list[str] | None = None,
    window_size: int = MOMENT_WINDOW_SIZE,
) -> dict[str, Any]:
    features = feature_columns or MOMENT_ANOMALY_FEATURE_COLUMNS
    profile_features = (baseline_profile or {}).get("features", {})
    normalization = {}

    for feature in features:
        stats = profile_features.get(feature, {})
        normalization[feature] = {
            "mean": _as_float(stats.get("mean"), default=0.0),
            "std": _safe_std(stats.get("std"), default=1.0),
        }

    return {
        "enabled": True,
        "model_id": model_id,
        "task_name": "reconstruction",
        "feature_columns": features,
        "window_size": int(window_size),
        "normalization": normalization,
        "score_quantiles": dict(score_quantiles or {}),
    }


def _pad_or_trim_window(values: np.ndarray, window_size: int) -> np.ndarray:
    if values.shape[0] >= window_size:
        return values[-window_size:]

    if values.shape[0] == 0:
        values = np.zeros((1, len(MOMENT_ANOMALY_FEATURE_COLUMNS)), dtype=np.float32)

    pad_count = window_size - values.shape[0]
    padding = np.repeat(values[:1], pad_count, axis=0)
    return np.vstack([padding, values])


def _build_moment_window(
    input_data: pd.DataFrame,
    config: Mapping[str, Any],
) -> np.ndarray:
    features = list(config.get("feature_columns") or MOMENT_ANOMALY_FEATURE_COLUMNS)
    window_size = int(config.get("window_size") or MOMENT_WINDOW_SIZE)
    data = ensure_feature_columns(input_data)

    for feature in features:
        if feature not in data.columns:
            data[feature] = np.nan

    values = data[features].astype(float).replace([np.inf, -np.inf], np.nan)
    normalization = config.get("normalization") or {}

    for feature in features:
        stats = normalization.get(feature, {})
        mean = _as_float(stats.get("mean"), default=float(values[feature].median(skipna=True) or 0.0))
        std = _safe_std(stats.get("std"), default=1.0)
        values[feature] = values[feature].fillna(mean)
        values[feature] = (values[feature] - mean) / std

    return _pad_or_trim_window(values.to_numpy(dtype=np.float32), window_size)


@lru_cache(maxsize=2)
def _load_moment_pipeline(model_id: str, task_name: str, device: str):
    try:
        import torch
        from momentfm import MOMENTPipeline
    except ImportError as exc:
        raise RuntimeError(
            "MOMENT dependencies are missing. Install torch, transformers, and momentfm."
        ) from exc

    model = MOMENTPipeline.from_pretrained(
        model_id,
        model_kwargs={"task_name": task_name},
    )
    if hasattr(model, "init"):
        model.init()
    model = model.to(device).float()
    model.eval()
    return model, torch


def compute_moment_reconstruction_score(
    input_data: pd.DataFrame,
    config: Mapping[str, Any],
) -> dict[str, Any]:
    if not config or not config.get("enabled", True):
        return {
            "enabled": False,
            "error": "MOMENT disabled in model artifact",
        }

    model_id = str(config.get("model_id") or MOMENT_MODEL_ID)
    task_name = str(config.get("task_name") or "reconstruction")

    try:
        import torch
    except ImportError:
        torch = None

    device = "cuda" if torch is not None and torch.cuda.is_available() else "cpu"
    try:
        model, torch = _load_moment_pipeline(model_id, task_name, device)
        window = _build_moment_window(input_data, config)
        x_enc = torch.from_numpy(window.T[None, :, :]).to(device).float()
        input_mask = torch.ones((1, x_enc.shape[-1]), device=device).long()

        with torch.no_grad():
            output = model(x_enc=x_enc, input_mask=input_mask)
            reconstruction = output.reconstruction
            mse_by_channel = ((x_enc - reconstruction) ** 2).mean(dim=-1).squeeze(0)
            reconstruction_error = float(mse_by_channel.mean().detach().cpu().item())

        risk_score = moment_risk_from_error(
            reconstruction_error,
            config.get("score_quantiles"),
        )

        return {
            "enabled": True,
            "engine": "MOMENT",
            "model_id": model_id,
            "task_name": task_name,
            "is_anomaly": risk_score >= 65.0,
            "risk_score": risk_score,
            "severity": anomaly_severity(risk_score),
            "reconstruction_error": round(reconstruction_error, 6),
            "channel_errors": {
                feature: round(float(value), 6)
                for feature, value in zip(
                    config.get("feature_columns", MOMENT_ANOMALY_FEATURE_COLUMNS),
                    mse_by_channel.detach().cpu().numpy().tolist(),
                )
            },
            "device": device,
        }
    except Exception as exc:
        return {
            "enabled": False,
            "engine": "MOMENT",
            "model_id": model_id,
            "error": str(exc),
        }


def compute_anomaly_assessment(
    artifact: Mapping[str, Any],
    input_data: pd.DataFrame,
) -> dict[str, Any]:
    moment_config = artifact.get("moment_anomaly_model")
    if moment_config:
        moment_assessment = compute_moment_reconstruction_score(input_data, moment_config)
        if moment_assessment.get("enabled"):
            return moment_assessment

    anomaly_model = artifact.get("anomaly_model")
    if anomaly_model is None:
        return {
            "enabled": False,
            "is_anomaly": False,
            "risk_score": None,
            "severity": "NON_DISPONIBLE",
            "decision_score": None,
            "raw_score": None,
            "fallback_error": (
                moment_assessment.get("error")
                if "moment_assessment" in locals()
                else None
            ),
        }

    features = artifact.get("feature_columns", FEATURE_COLUMNS)
    input_features = ensure_feature_columns(input_data)[features]
    prediction = int(anomaly_model.predict(input_features)[0])
    decision_score = float(anomaly_model.decision_function(input_features)[0])
    raw_score = float(anomaly_model.score_samples(input_features)[0])
    risk_score = anomaly_risk_from_decision(
        decision_score,
        artifact.get("anomaly_score_quantiles"),
    )

    return {
        "enabled": True,
        "engine": "IsolationForest",
        "is_anomaly": prediction == -1,
        "risk_score": risk_score,
        "severity": anomaly_severity(risk_score),
        "decision_score": round(decision_score, 6),
        "raw_score": round(raw_score, 6),
        "fallback_error": (
            moment_assessment.get("error")
            if "moment_assessment" in locals()
            else None
        ),
    }


def resolve_final_label(classifier_label: str, anomaly_assessment: Mapping[str, Any]) -> str:
    if (
        classifier_label == "NORMAL"
        and anomaly_assessment.get("enabled")
        and (
            anomaly_assessment.get("is_anomaly")
            or _as_float(anomaly_assessment.get("risk_score")) >= 65
        )
    ):
        if anomaly_assessment.get("engine") == "MOMENT":
            return "ANOMALIE_MOMENT"
        return "ANOMALIE_ISOLATION_FOREST"

    return classifier_label


def resolve_final_decision(label: str, anomaly_assessment: Mapping[str, Any]) -> str:
    base_decision = get_decision(label)
    risk_score = anomaly_assessment.get("risk_score")

    if risk_score is None:
        return base_decision

    risk_score = _as_float(risk_score)
    if risk_score >= 85:
        return "ARRET_RECOMMANDE"
    if risk_score >= 65 and base_decision == "SURVEILLANCE":
        return "INSPECTION_PRIORITAIRE"
    if risk_score >= 40 and base_decision == "SURVEILLANCE":
        return "MAINTENANCE_PLANIFIEE"

    return base_decision


def extract_prediction_probability(
    diagnostic_model: Any,
    input_features: pd.DataFrame,
    label: str,
) -> float | None:
    if diagnostic_model is None or not hasattr(diagnostic_model, "predict_proba"):
        return None

    try:
        probabilities = diagnostic_model.predict_proba(input_features)[0]
        classes = list(getattr(diagnostic_model, "classes_", []))
        if label in classes:
            return float(probabilities[classes.index(label)])
        return float(np.max(probabilities))
    except Exception:
        return None


def _baseline_feature_score(feature: str, value: float, baseline_profile: Mapping[str, Any] | None) -> float:
    stats = (baseline_profile or {}).get("features", {}).get(feature, {})
    mean = _as_float(stats.get("mean"), default=0.0)
    std = _safe_std(stats.get("std"), default=1.0)
    return abs(value - mean) / std


def top_contributing_features(
    input_features: pd.DataFrame,
    artifact: Mapping[str, Any],
    limit: int = 5,
) -> list[dict[str, Any]]:
    row = input_features.iloc[0]
    baseline_profile = artifact.get("baseline_profile")
    diagnostic_model = artifact.get("diagnostic_model")
    model_importances = None

    if hasattr(diagnostic_model, "feature_importances_"):
        model_importances = np.asarray(diagnostic_model.feature_importances_, dtype=float)

    contributions = []
    for index, feature in enumerate(input_features.columns):
        value = _as_float(row.get(feature))
        baseline_score = _baseline_feature_score(feature, value, baseline_profile)
        model_weight = float(model_importances[index]) if model_importances is not None and index < len(model_importances) else 1.0
        contribution = baseline_score * max(model_weight, 0.05)
        contributions.append(
            {
                "feature": feature,
                "value": round(value, 6),
                "contribution": round(float(contribution), 6),
                "baseline_deviation": round(float(baseline_score), 6),
            }
        )

    return sorted(contributions, key=lambda item: item["contribution"], reverse=True)[:limit]


def build_rule_explanation(
    label: str,
    anomaly_assessment: Mapping[str, Any],
    contributions: list[dict[str, Any]],
) -> str:
    if contributions:
        feature_text = ", ".join(
            f"{item['feature']}={item['value']}" for item in contributions[:3]
        )
    else:
        feature_text = "no dominant feature deviation"

    anomaly_text = ""
    if anomaly_assessment.get("enabled"):
        anomaly_text = (
            f" Anomaly engine {anomaly_assessment.get('engine')} returned risk "
            f"{anomaly_assessment.get('risk_score')}."
        )

    return (
        f"Prediction {label} was selected because the strongest recent signals were "
        f"{feature_text}.{anomaly_text} {get_cause_probable(label)}."
    )


def save_registry_entry(entry: Mapping[str, Any], path: Path = MODEL_REGISTRY_FILE) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    existing: list[dict[str, Any]] = []
    if path.exists():
        try:
            import json

            existing = json.loads(path.read_text(encoding="utf-8"))
            if not isinstance(existing, list):
                existing = []
        except Exception:
            existing = []

    existing.append(dict(entry))
    import json

    path.write_text(json.dumps(existing, indent=2), encoding="utf-8")


def predict_maintenance(
    artifact: Mapping[str, Any],
    input_data: pd.DataFrame,
) -> dict[str, Any]:
    features = artifact.get("feature_columns", FEATURE_COLUMNS)
    input_features = ensure_feature_columns(input_data)[features]
    diagnostic_model = artifact.get("diagnostic_model")

    if diagnostic_model is None:
        classifier_label = "DIAGNOSTIC_INCONNU"
    else:
        classifier_label = str(diagnostic_model.predict(input_features)[0])

    anomaly_assessment = compute_anomaly_assessment(artifact, input_features)
    final_label = resolve_final_label(classifier_label, anomaly_assessment)
    probability = extract_prediction_probability(diagnostic_model, input_features, classifier_label)
    contributions = top_contributing_features(input_features, artifact)
    explanation = build_rule_explanation(final_label, anomaly_assessment, contributions)
    anomaly_score = anomaly_assessment.get("risk_score")

    # SHAP explanation (if available)
    shap_explanation = None
    try:
        from explainability import compute_shap_explanation
        shap_explanation = compute_shap_explanation(artifact, input_features)
    except Exception:
        pass  # SHAP is optional

    return {
        "diagnostic_label": final_label,
        "classifier_label": classifier_label,
        "cause_probable": get_cause_probable(final_label),
        "recommandation": get_recommandation(final_label),
        "decision": resolve_final_decision(final_label, anomaly_assessment),
        "confidence": probability,
        "probability": probability,
        "anomaly_score": anomaly_score,
        "anomaly_detection": anomaly_assessment,
        "top_contributing_features": contributions,
        "explanation": explanation,
        "shap_explanation": shap_explanation,
        "model_name": artifact.get("model_name", "diagnostic_model"),
        "model_version": artifact.get("version", 1),
        "input_data": input_features.to_dict(orient="records")[0],
    }


def load_rul_model_artifact(model_file: str | Path = RUL_MODEL_FILE) -> dict[str, Any]:
    import joblib

    model_path = Path(model_file)
    if not model_path.exists():
        return {
            "model_name": "proxy_rul",
            "version": "simulated-1",
            "model": None,
            "feature_columns": FEATURE_COLUMNS,
            "simulated": True,
        }
    artifact = joblib.load(model_path)
    if isinstance(artifact, dict):
        artifact.setdefault("feature_columns", FEATURE_COLUMNS)
        artifact.setdefault("simulated", artifact.get("model") is None)
        return artifact
    return {
        "model_name": "rul_model",
        "version": 1,
        "model": artifact,
        "feature_columns": FEATURE_COLUMNS,
        "simulated": False,
    }


def proxy_rul_prediction(input_features: pd.DataFrame) -> dict[str, Any]:
    row = input_features.iloc[0]
    temperature = _as_float(row.get("temperature"))
    vibration = _as_float(row.get("vibration"))
    courant_abs = abs(_as_float(row.get("courant_abs", row.get("courant"))))
    health = _as_float(row.get("component_health_score"), default=1.0)
    failure_probability = _as_float(row.get("failure_probability"))
    temperature_delta = max(0.0, _as_float(row.get("temperature_delta_1h")))
    vibration_delta = max(0.0, _as_float(row.get("vibration_delta_1h")))

    stress = (
        0.30 * np.clip((temperature - 55.0) / 45.0, 0.0, 1.0)
        + 0.25 * np.clip(vibration / 2.0, 0.0, 1.0)
        + 0.20 * np.clip(courant_abs / 140.0, 0.0, 1.0)
        + 0.15 * np.clip(failure_probability, 0.0, 1.0)
        + 0.10 * np.clip((temperature_delta / 20.0) + (vibration_delta / 1.0), 0.0, 1.0)
    )
    health_factor = np.clip(health, 0.05, 1.0)
    rul_hours = float(np.clip(1200.0 * health_factor * (1.0 - 0.85 * stress), 4.0, 1200.0))

    return {
        "rul_hours": round(rul_hours, 2),
        "rul_days": round(rul_hours / 24.0, 2),
        "confidence": 0.45,
        "method": "simulated_proxy_rul",
        "simulated": True,
        "explanation": (
            "Simulated proxy RUL because no real failure-date RUL model is available. "
            "Estimate is based on health score, failure probability, temperature, current, vibration, and recent deltas."
        ),
    }


def predict_rul(
    artifact: Mapping[str, Any],
    input_data: pd.DataFrame,
) -> dict[str, Any]:
    features = list(artifact.get("feature_columns") or FEATURE_COLUMNS)
    input_features = ensure_feature_columns(input_data)[features]
    model = artifact.get("model")

    if model is None:
        result = proxy_rul_prediction(input_features)
    else:
        predicted_hours = float(model.predict(input_features)[0])
        result = {
            "rul_hours": round(max(predicted_hours, 0.0), 2),
            "rul_days": round(max(predicted_hours, 0.0) / 24.0, 2),
            "confidence": artifact.get("validation_score", 0.60),
            "method": artifact.get("model_name", "rul_model"),
            "simulated": bool(artifact.get("simulated", False)),
            "explanation": "RUL predicted from supervised time-to-failure labels generated from maintenance history.",
        }

    result["model_name"] = artifact.get("model_name", result["method"])
    result["model_version"] = artifact.get("version", "unknown")
    result["input_data"] = input_features.to_dict(orient="records")[0]
    return result
