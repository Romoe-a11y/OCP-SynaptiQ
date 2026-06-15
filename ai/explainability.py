"""SHAP-based model explainability for predictive maintenance diagnostics."""

from __future__ import annotations

from functools import lru_cache
from typing import Any

import numpy as np
import pandas as pd

from logging_config import get_logger

logger = get_logger("explainability")


@lru_cache(maxsize=4)
def _get_shap_explainer(model_id: int):
    """Cache SHAP explainers by model identity (id of the model object)."""
    try:
        import shap
        return shap
    except ImportError:
        return None


def compute_shap_explanation(
    artifact: dict[str, Any],
    input_features: pd.DataFrame,
    max_features: int = 8,
) -> dict[str, Any]:
    """
    Compute SHAP values for a prediction.

    Falls back to the existing deviation-based method if SHAP is unavailable
    or the model type is incompatible.
    """
    diagnostic_model = artifact.get("diagnostic_model")
    if diagnostic_model is None:
        return {"method": "none", "error": "No diagnostic model available"}

    try:
        import shap
    except ImportError:
        logger.info("SHAP not installed — using fallback feature attribution")
        return _fallback_explanation(artifact, input_features, max_features)

    try:
        # For tree-based models (HistGradientBoosting, RandomForest, etc.)
        # Extract the base estimator from Pipeline/CalibratedClassifierCV
        base_model = _extract_base_model(diagnostic_model)
        imputed_features = _impute_features(diagnostic_model, input_features)

        if base_model is not None and hasattr(base_model, "predict"):
            explainer = shap.TreeExplainer(base_model)
            shap_values = explainer.shap_values(imputed_features)

            # Handle multi-class output
            if isinstance(shap_values, list):
                # Get predicted class index
                prediction = diagnostic_model.predict(input_features)[0]
                classes = list(getattr(diagnostic_model, "classes_", []))
                class_idx = classes.index(prediction) if prediction in classes else 0
                values = shap_values[class_idx][0]
            elif shap_values.ndim == 3:
                prediction = diagnostic_model.predict(input_features)[0]
                classes = list(getattr(diagnostic_model, "classes_", []))
                class_idx = classes.index(prediction) if prediction in classes else 0
                values = shap_values[0, :, class_idx]
            else:
                values = shap_values[0]

            feature_names = list(input_features.columns)
            contributions = []
            for i, (name, shap_val) in enumerate(zip(feature_names, values)):
                contributions.append({
                    "feature": name,
                    "shap_value": round(float(shap_val), 6),
                    "abs_shap": round(abs(float(shap_val)), 6),
                    "value": round(float(imputed_features.iloc[0, i]), 6),
                    "direction": "increases_risk" if shap_val > 0 else "decreases_risk",
                })

            contributions.sort(key=lambda x: x["abs_shap"], reverse=True)
            top = contributions[:max_features]

            explanation_text = _build_explanation_text(top, prediction)

            return {
                "method": "shap_tree",
                "predicted_class": str(prediction),
                "base_value": round(float(explainer.expected_value[class_idx])
                                    if isinstance(explainer.expected_value, (list, np.ndarray))
                                    else float(explainer.expected_value), 6),
                "top_features": top,
                "all_features": contributions,
                "explanation": explanation_text,
            }

        # Fallback for non-tree models
        return _fallback_explanation(artifact, input_features, max_features)

    except Exception as exc:
        logger.warning(f"SHAP computation failed: {exc}, using fallback")
        return _fallback_explanation(artifact, input_features, max_features)


def _extract_base_model(model):
    """Extract the base tree model from Pipeline/CalibratedClassifierCV wrappers."""
    from sklearn.calibration import CalibratedClassifierCV
    from sklearn.pipeline import Pipeline

    current = model

    # Unwrap CalibratedClassifierCV
    if isinstance(current, CalibratedClassifierCV):
        current = current.estimator
        if current is None and hasattr(model, "calibrated_classifiers_"):
            # Already fitted — get the base from first calibrated classifier
            current = model.calibrated_classifiers_[0].estimator

    # Unwrap Pipeline
    if isinstance(current, Pipeline):
        # Get the last step (the actual model)
        last_step = current.steps[-1][1]
        return last_step

    return current


def _impute_features(model, input_features: pd.DataFrame) -> pd.DataFrame:
    """Run input through the Pipeline's imputer if present."""
    from sklearn.pipeline import Pipeline

    current = model

    # Unwrap CalibratedClassifierCV
    from sklearn.calibration import CalibratedClassifierCV
    if isinstance(current, CalibratedClassifierCV):
        if hasattr(current, "calibrated_classifiers_"):
            current = current.calibrated_classifiers_[0].estimator
        elif current.estimator is not None:
            current = current.estimator

    if isinstance(current, Pipeline):
        # Run through all steps except the last (the estimator)
        data = input_features.copy()
        for name, step in current.steps[:-1]:
            if hasattr(step, "transform"):
                transformed = step.transform(data)
                data = pd.DataFrame(transformed, columns=input_features.columns)
        return data

    return input_features.fillna(0)


def _fallback_explanation(
    artifact: dict[str, Any],
    input_features: pd.DataFrame,
    max_features: int,
) -> dict[str, Any]:
    """Deviation-based feature attribution when SHAP is unavailable."""
    from maintenance_core import top_contributing_features

    contributions = top_contributing_features(input_features, artifact, limit=max_features)
    return {
        "method": "deviation_based",
        "top_features": contributions,
        "explanation": "Feature attribution based on deviation from training baseline (SHAP unavailable).",
    }


def _build_explanation_text(top_features: list[dict[str, Any]], prediction: str) -> str:
    """Build a human-readable explanation from SHAP values."""
    if not top_features:
        return f"Prediction '{prediction}' was made but no dominant features were identified."

    increasing = [f for f in top_features[:5] if f["direction"] == "increases_risk"]
    decreasing = [f for f in top_features[:5] if f["direction"] == "decreases_risk"]

    parts = [f"The prediction '{prediction}' was driven by:"]

    if increasing:
        inc_text = ", ".join(f"{f['feature']}={f['value']}" for f in increasing[:3])
        parts.append(f"Risk-increasing factors: {inc_text}.")

    if decreasing:
        dec_text = ", ".join(f"{f['feature']}={f['value']}" for f in decreasing[:3])
        parts.append(f"Risk-mitigating factors: {dec_text}.")

    return " ".join(parts)
