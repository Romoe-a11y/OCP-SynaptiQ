"""Production-grade Predictive Maintenance FastAPI application."""
from __future__ import annotations

import json
import subprocess
import sys
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import BackgroundTasks, Depends, FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from config import get_settings
from logging_config import get_logger, setup_logging
from app.alert_manager import AlertStore
from maintenance_core import (
    DRIFT_REPORT_FILE,
    MODEL_FILE,
    OUTPUTS_DIR,
    RAW_FEATURE_COLUMNS,
    RUL_MODEL_FILE,
    dataframe_from_payload,
    load_model_artifact,
    load_rul_model_artifact,
    predict_maintenance,
    predict_rul,
)

settings = get_settings()
setup_logging(level=settings.LOG_LEVEL)
logger = get_logger("api")

api = FastAPI(
    title="Predictive Maintenance API",
    version="4.0.0",
    description="Production motor diagnostic, anomaly detection, RUL prediction, alert management, and drift monitoring.",
    docs_url="/docs",
    redoc_url="/redoc",
)

api.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID", "X-Response-Time-Ms"],
)


@api.middleware("http")
async def request_middleware(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID", str(uuid.uuid4())[:12])
    request.state.request_id = request_id
    start = time.perf_counter()
    try:
        response = await call_next(request)
    except Exception:
        duration_ms = round((time.perf_counter() - start) * 1000, 2)
        logger.error(
            "Unhandled error on %s %s", request.method, request.url.path,
            extra={"request_id": request_id, "duration_ms": duration_ms},
        )
        return JSONResponse(status_code=500, content={"error": "Internal server error", "request_id": request_id})
    duration_ms = round((time.perf_counter() - start) * 1000, 2)
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Response-Time-Ms"] = str(duration_ms)
    logger.info(
        "%s %s -> %s", request.method, request.url.path, response.status_code,
        extra={"request_id": request_id, "duration_ms": duration_ms, "status_code": response.status_code},
    )
    return response


async def verify_api_key(request: Request):
    if not settings.API_KEY:
        return
    auth_header = request.headers.get("Authorization", "")
    api_key_header = request.headers.get("X-API-Key", "")
    token = ""
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
    elif api_key_header:
        token = api_key_header
    if token != settings.API_KEY:
        raise HTTPException(status_code=401, detail="Invalid or missing API key")


@api.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    request_id = getattr(request.state, "request_id", "unknown")
    logger.error("Unhandled: %s: %s", type(exc).__name__, exc, extra={"request_id": request_id})
    detail = str(exc) if settings.LOG_LEVEL == "DEBUG" else "Contact administrator"
    return JSONResponse(status_code=500, content={"error": "Internal server error", "detail": detail, "request_id": request_id})


model_artifact = load_model_artifact(MODEL_FILE)
rul_model_artifact = load_rul_model_artifact(RUL_MODEL_FILE)
alert_store = AlertStore(OUTPUTS_DIR / "managed_alerts.csv")
logger.info("Models loaded: diagnostic v%s, RUL v%s (simulated=%s)",
            model_artifact.get("version"), rul_model_artifact.get("version"), rul_model_artifact.get("simulated", True))


class SensorReading(BaseModel):
    temperature: float = Field(..., description="Motor temperature in C")
    courant: float = Field(..., description="Battery/motor current in A")
    vibration: float = Field(..., description="Motor vibration level")
    couple: float = Field(..., description="Motor torque in Nm")
    rpm: float = Field(..., description="Motor RPM")
    failure_probability: float = Field(..., ge=0.0, le=1.0)
    component_health_score: float = Field(..., ge=0.0, le=1.0)
    machine_id: int = Field(default=1, ge=1)
    horodatage: datetime | None = Field(default=None)


class PredictionRequest(SensorReading):
    history: list[SensorReading] = Field(default_factory=list)
    create_alert: bool = Field(default=True)


class BatchPredictionRequest(BaseModel):
    readings: list[PredictionRequest] = Field(..., min_length=1, max_length=100)


class AlertStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(ACTIVE|ACKNOWLEDGED|RESOLVED|active|acknowledged|resolved)$")
    resolution_note: str = ""


def payload_to_dict(payload: PredictionRequest) -> dict[str, Any]:
    data = payload.model_dump(mode="json")
    data["history"] = [item.model_dump(mode="json") for item in payload.history]
    return data


def run_retraining_pipeline():
    logger.info("Starting retraining pipeline")
    result = subprocess.run(
        [sys.executable, str(PROJECT_ROOT / "scripts" / "retrain_pipeline.py")],
        cwd=PROJECT_ROOT, text=True, capture_output=True, check=False,
    )
    if result.returncode == 0:
        logger.info("Retraining pipeline completed successfully")
    else:
        logger.error("Retraining pipeline failed with code %s", result.returncode)


@api.get("/", tags=["Status"])
def root():
    return {
        "service": "Predictive Maintenance API",
        "version": "4.0.0",
        "docs": "/docs",
        "health": "/health",
        "model_version": model_artifact.get("version"),
        "rul_model_version": rul_model_artifact.get("version"),
        "rul_simulated": rul_model_artifact.get("simulated", True),
    }


@api.get("/health", tags=["Status"])
def health():
    moment_config = model_artifact.get("moment_anomaly_model") or {}
    model_age_hours = None
    created_at = model_artifact.get("created_at")
    if created_at:
        try:
            created = datetime.fromisoformat(str(created_at))
            model_age_hours = round((datetime.now(timezone.utc) - created).total_seconds() / 3600, 1)
        except Exception:
            pass
    return {
        "status": "healthy",
        "model_loaded": MODEL_FILE.exists(),
        "model_version": model_artifact.get("version"),
        "model_age_hours": model_age_hours,
        "feature_count": len(model_artifact.get("feature_columns", [])),
        "raw_required_fields": RAW_FEATURE_COLUMNS,
        "rul_model_loaded": RUL_MODEL_FILE.exists(),
        "rul_simulated": rul_model_artifact.get("simulated", True),
        "moment_enabled": bool(moment_config),
        "moment_model_id": moment_config.get("model_id"),
        "fallback_anomaly_model": "IsolationForest" if model_artifact.get("anomaly_model") is not None else None,
    }


@api.get("/model-info", tags=["Status"], dependencies=[Depends(verify_api_key)])
def model_info():
    moment_config = model_artifact.get("moment_anomaly_model") or {}
    return {
        "model_file": str(MODEL_FILE),
        "version": model_artifact.get("version"),
        "created_at": model_artifact.get("created_at"),
        "feature_columns": model_artifact.get("feature_columns"),
        "moment_anomaly_model": {
            "enabled": bool(moment_config),
            "model_id": moment_config.get("model_id"),
            "task_name": moment_config.get("task_name"),
            "window_size": moment_config.get("window_size"),
            "feature_columns": moment_config.get("feature_columns"),
            "calibrated": bool(moment_config.get("score_quantiles")),
        },
        "diagnostic_classes": model_artifact.get("diagnostic_classes"),
        "training_validation": model_artifact.get("training_validation"),
        "training_metrics": model_artifact.get("training_metrics"),
        "rul_model": {
            "model_file": str(RUL_MODEL_FILE),
            "version": rul_model_artifact.get("version"),
            "model_name": rul_model_artifact.get("model_name"),
            "simulated": rul_model_artifact.get("simulated", True),
            "metrics": rul_model_artifact.get("metrics"),
        },
    }


@api.post("/predict", tags=["Prediction"], dependencies=[Depends(verify_api_key)])
def predict(payload: PredictionRequest):
    start = time.perf_counter()
    input_data = dataframe_from_payload(payload_to_dict(payload))
    result = predict_maintenance(model_artifact, input_data)
    result["machine_id"] = payload.machine_id
    result["inference_time_ms"] = round((time.perf_counter() - start) * 1000, 2)
    alert = alert_store.upsert_from_prediction(result) if payload.create_alert else None
    result["alert"] = alert
    logger.info("Prediction: %s (machine=%s)", result["diagnostic_label"], payload.machine_id,
                extra={"machine_id": payload.machine_id, "model_version": model_artifact.get("version")})
    return result


@api.post("/predict-rul", tags=["Prediction"], dependencies=[Depends(verify_api_key)])
def predict_rul_endpoint(payload: PredictionRequest):
    start = time.perf_counter()
    input_data = dataframe_from_payload(payload_to_dict(payload))
    result = predict_rul(rul_model_artifact, input_data)
    result["machine_id"] = payload.machine_id
    result["inference_time_ms"] = round((time.perf_counter() - start) * 1000, 2)
    logger.info("RUL prediction: %sh (machine=%s)", result.get("rul_hours", "N/A"), payload.machine_id)
    return result


@api.post("/predict-batch", tags=["Prediction"], dependencies=[Depends(verify_api_key)])
def predict_batch(payload: BatchPredictionRequest):
    start = time.perf_counter()
    predictions = []
    for reading in payload.readings:
        input_data = dataframe_from_payload(payload_to_dict(reading))
        result = predict_maintenance(model_artifact, input_data)
        result["machine_id"] = reading.machine_id
        alert = alert_store.upsert_from_prediction(result) if reading.create_alert else None
        result["alert"] = alert
        predictions.append(result)
    total_ms = round((time.perf_counter() - start) * 1000, 2)
    logger.info("Batch prediction: %s readings in %sms", len(predictions), total_ms)
    return {"count": len(predictions), "total_inference_time_ms": total_ms, "predictions": predictions}


@api.get("/alerts", tags=["Alerts"], dependencies=[Depends(verify_api_key)])
def list_alerts(
    status: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=500),
):
    alerts = alert_store.list_alerts(status=status)
    return {"summary": alert_store.summary(), "count": len(alerts[:limit]), "alerts": alerts[:limit]}


@api.patch("/alerts/{alert_id}", tags=["Alerts"], dependencies=[Depends(verify_api_key)])
def update_alert(alert_id: int, payload: AlertStatusUpdate):
    try:
        return alert_store.update_status(alert_id, payload.status, payload.resolution_note)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@api.get("/drift", tags=["Monitoring"], dependencies=[Depends(verify_api_key)])
def drift_report():
    if not DRIFT_REPORT_FILE.exists():
        return {"status": "NO_REPORT", "message": "Run scripts/monitor_drift.py or POST /retrain first."}
    return json.loads(DRIFT_REPORT_FILE.read_text(encoding="utf-8"))


@api.post("/retrain", tags=["Training"], dependencies=[Depends(verify_api_key)])
def retrain(background_tasks: BackgroundTasks):
    background_tasks.add_task(run_retraining_pipeline)
    logger.info("Retraining pipeline scheduled")
    return {"status": "scheduled", "pipeline": "scripts/retrain_pipeline.py"}


@api.post("/model/reload", tags=["Model Management"], dependencies=[Depends(verify_api_key)])
def reload_models():
    global model_artifact, rul_model_artifact
    try:
        model_artifact = load_model_artifact(MODEL_FILE)
        rul_model_artifact = load_rul_model_artifact(RUL_MODEL_FILE)
        logger.info("Models reloaded: diagnostic v%s, RUL v%s",
                     model_artifact.get("version"), rul_model_artifact.get("version"))
        return {"status": "reloaded", "diagnostic_version": model_artifact.get("version"),
                "rul_version": rul_model_artifact.get("version")}
    except Exception as exc:
        logger.error("Model reload failed: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@api.get("/metrics", tags=["Monitoring"], dependencies=[Depends(verify_api_key)])
def metrics():
    report_path = OUTPUTS_DIR / "training_reports" / "latest_training_report.json"
    rul_report_path = OUTPUTS_DIR / "training_reports" / "latest_rul_training_report.json"
    result: dict[str, Any] = {"diagnostic": None, "rul": None, "drift": None}
    if report_path.exists():
        result["diagnostic"] = json.loads(report_path.read_text(encoding="utf-8"))
    if rul_report_path.exists():
        result["rul"] = json.loads(rul_report_path.read_text(encoding="utf-8"))
    if DRIFT_REPORT_FILE.exists():
        result["drift"] = json.loads(DRIFT_REPORT_FILE.read_text(encoding="utf-8"))
    return result


app = api
