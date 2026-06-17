"""Flask compatibility layer for the Spring Boot backend."""
from __future__ import annotations

import os
import sys
from pathlib import Path

from flask import Flask, jsonify, request

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from logging_config import get_logger, setup_logging
from maintenance_core import (
    MODEL_FILE,
    RUL_MODEL_FILE,
    dataframe_from_payload,
    load_model_artifact,
    load_rul_model_artifact,
    predict_maintenance,
    predict_rul,
    validate_payload,
)

setup_logging(level="INFO")
logger = get_logger("flask")

app = Flask(__name__)

# Gracefully handle missing model files (they are gitignored binary artifacts).
# The Spring Boot backend has its own fallback predictions when AI returns errors.
try:
    model_artifact = load_model_artifact(MODEL_FILE)
    logger.info("Diagnostic model loaded successfully")
except FileNotFoundError:
    logger.warning("Diagnostic model not found at %s — running without predictions", MODEL_FILE)
    model_artifact = None

try:
    rul_model_artifact = load_rul_model_artifact(RUL_MODEL_FILE)
    logger.info("RUL model loaded successfully")
except FileNotFoundError:
    logger.warning("RUL model not found at %s — running without RUL predictions", RUL_MODEL_FILE)
    rul_model_artifact = None


@app.route("/predict", methods=["POST"])
def predict():
    if model_artifact is None:
        return jsonify({"error": "Model not loaded — train models first"}), 503
    try:
        data = request.get_json()
        is_valid, error_message = validate_payload(data)
        if not is_valid:
            return jsonify({"error": error_message}), 400
        input_data = dataframe_from_payload(data)
        result = predict_maintenance(model_artifact, input_data)
        logger.info("Prediction: %s", result.get("diagnostic_label"))
        return jsonify(result), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        logger.error("Prediction error: %s", e)
        return jsonify({"error": "Internal server error"}), 500


@app.route("/predict-rul", methods=["POST"])
def predict_remaining_useful_life():
    if rul_model_artifact is None:
        return jsonify({"error": "RUL model not loaded — train models first"}), 503
    try:
        data = request.get_json()
        is_valid, error_message = validate_payload(data)
        if not is_valid:
            return jsonify({"error": error_message}), 400
        input_data = dataframe_from_payload(data)
        result = predict_rul(rul_model_artifact, input_data)
        result["machine_id"] = data.get("machine_id", 1)
        return jsonify(result), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        logger.error("RUL prediction error: %s", e)
        return jsonify({"error": "Internal server error"}), 500


@app.route("/health", methods=["GET"])
def health_check():
    models_loaded = model_artifact is not None and rul_model_artifact is not None
    return jsonify({
        "status": "healthy",
        "models_loaded": models_loaded,
        "model_version": model_artifact.get("version") if model_artifact else None,
    }), 200


@app.route("/", methods=["GET"])
def home():
    moment_config = (model_artifact or {}).get("moment_anomaly_model") or {}
    return jsonify({
        "service": "Predictive Maintenance API (Flask)",
        "model_version": (model_artifact or {}).get("version", 1),
        "rul_simulated": (rul_model_artifact or {}).get("simulated", True),
        "moment_enabled": bool(moment_config),
        "models_loaded": model_artifact is not None,
    })


if __name__ == "__main__":
    debug = os.getenv("AI_FLASK_DEBUG", "false").lower() in {"1", "true", "yes", "on"}
    reload = os.getenv("AI_FLASK_RELOAD", "false").lower() in {"1", "true", "yes", "on"}
    host = os.getenv("AI_API_HOST", "0.0.0.0")
    port = int(os.getenv("AI_API_PORT", "5001"))
    app.run(host=host, port=port, debug=debug, use_reloader=reload)
