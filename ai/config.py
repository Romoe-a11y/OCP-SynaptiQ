"""Centralized configuration via environment variables with sensible defaults."""

from __future__ import annotations

import os
from pathlib import Path
from functools import lru_cache


class Settings:
    """Application settings loaded from environment variables."""

    def __init__(self):
        self.PROJECT_ROOT = Path(__file__).resolve().parent

        # ── Paths ──
        self.DATA_DIR = Path(os.getenv("AI_DATA_DIR", str(self.PROJECT_ROOT / "data")))
        self.MODELS_DIR = Path(os.getenv("AI_MODELS_DIR", str(self.PROJECT_ROOT / "models")))
        self.OUTPUTS_DIR = Path(os.getenv("AI_OUTPUTS_DIR", str(self.PROJECT_ROOT / "outputs")))

        self.RAW_DATASET_FILE = self.DATA_DIR / os.getenv(
            "RAW_DATASET_FILENAME", "EV_Predictive_Maintenance_Dataset_15min.csv"
        )
        self.CLEAN_DATASET_FILE = self.DATA_DIR / os.getenv(
            "CLEAN_DATASET_FILENAME", "dataset_supervision_moteur_clean.csv"
        )
        self.LABELED_DATASET_FILE = self.DATA_DIR / os.getenv(
            "LABELED_DATASET_FILENAME", "dataset_supervision_moteur_labeled.csv"
        )
        self.MODEL_FILE = self.MODELS_DIR / os.getenv("MODEL_FILENAME", "diagnostic_model.pkl")
        self.RUL_MODEL_FILE = self.MODELS_DIR / os.getenv("RUL_MODEL_FILENAME", "rul_model.pkl")
        self.DRIFT_REPORT_FILE = self.OUTPUTS_DIR / os.getenv("DRIFT_REPORT_FILENAME", "drift_report.json")
        self.MODEL_REGISTRY_FILE = self.OUTPUTS_DIR / os.getenv("MODEL_REGISTRY_FILENAME", "model_registry.json")

        # ── API ──
        self.API_HOST = os.getenv("AI_API_HOST", "0.0.0.0")
        self.API_PORT = int(os.getenv("AI_API_PORT", "5001"))
        self.API_KEY = os.getenv("AI_API_KEY", "")  # empty = no auth
        self.CORS_ORIGINS = os.getenv("AI_CORS_ORIGINS", "http://localhost:5173,http://localhost:3000,http://localhost:8080").split(",")
        self.LOG_LEVEL = os.getenv("AI_LOG_LEVEL", "INFO").upper()

        # ── MOMENT ──
        self.MOMENT_MODEL_ID = os.getenv("MOMENT_MODEL_ID", "AutonLab/MOMENT-1-large")
        self.MOMENT_WINDOW_SIZE = int(os.getenv("MOMENT_WINDOW_SIZE", "512"))
        self.MOMENT_CALIBRATION_WINDOWS = int(os.getenv("MOMENT_CALIBRATION_WINDOWS", "16"))

        # ── PostgreSQL (for RUL training) ──
        self.POSTGRES_HOST = os.getenv("POSTGRES_HOST", "localhost")
        self.POSTGRES_PORT = int(os.getenv("POSTGRES_PORT", "5432"))
        self.POSTGRES_DB = os.getenv("POSTGRES_DB", "supervision_moteur_db")
        self.POSTGRES_USER = os.getenv("POSTGRES_USER", "postgres")
        self.POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "samia")

        # ── Training ──
        self.TRAIN_RATIO = float(os.getenv("TRAIN_RATIO", "0.80"))
        self.HGB_MAX_ITER = int(os.getenv("HGB_MAX_ITER", "250"))
        self.HGB_LEARNING_RATE = float(os.getenv("HGB_LEARNING_RATE", "0.06"))
        self.IFOREST_N_ESTIMATORS = int(os.getenv("IFOREST_N_ESTIMATORS", "400"))


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return the singleton settings instance."""
    return Settings()
