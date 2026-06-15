from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import pandas as pd

ALERT_COLUMNS = [
    "id",
    "machine_id",
    "diagnostic_label",
    "severity",
    "decision",
    "status",
    "message",
    "risk_score",
    "occurrence_count",
    "created_at",
    "updated_at",
    "resolution_note",
]

ALERTING_DECISIONS = {
    "MAINTENANCE_PLANIFIEE",
    "INSPECTION_PRIORITAIRE",
    "INTERVENTION_URGENTE",
    "ARRET_RECOMMANDE",
}


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


class AlertStore:
    def __init__(self, path: Path):
        self.path = path
        self.path.parent.mkdir(parents=True, exist_ok=True)

    def _empty(self) -> pd.DataFrame:
        return pd.DataFrame(columns=ALERT_COLUMNS)

    def read(self) -> pd.DataFrame:
        if not self.path.exists():
            return self._empty()
        df = pd.read_csv(self.path, keep_default_na=False)
        for column in ALERT_COLUMNS:
            if column not in df.columns:
                df[column] = None
        return df[ALERT_COLUMNS]

    def write(self, df: pd.DataFrame):
        self.path.parent.mkdir(parents=True, exist_ok=True)
        df[ALERT_COLUMNS].to_csv(self.path, index=False, encoding="utf-8")

    def list_alerts(self, status: str | None = None) -> list[dict[str, Any]]:
        df = self.read()
        if status:
            df = df[df["status"].astype(str).str.upper() == status.upper()]
        df = df.sort_values("updated_at", ascending=False)
        return df.replace({pd.NA: None}).where(pd.notna(df), None).to_dict(orient="records")

    def summary(self) -> dict[str, Any]:
        df = self.read()
        if df.empty:
            return {"total": 0, "active": 0, "acknowledged": 0, "resolved": 0}
        statuses = df["status"].astype(str).str.upper().value_counts()
        return {
            "total": int(len(df)),
            "active": int(statuses.get("ACTIVE", 0)),
            "acknowledged": int(statuses.get("ACKNOWLEDGED", 0)),
            "resolved": int(statuses.get("RESOLVED", 0)),
        }

    def upsert_from_prediction(self, prediction: dict[str, Any]) -> dict[str, Any] | None:
        decision = prediction.get("decision")
        if decision not in ALERTING_DECISIONS:
            return None

        input_data = prediction.get("input_data", {})
        machine_id = int(prediction.get("machine_id", input_data.get("machine_id", 1)))
        label = str(prediction.get("diagnostic_label", "DIAGNOSTIC_INCONNU"))
        anomaly = prediction.get("anomaly_detection", {}) or {}
        severity = str(anomaly.get("severity") or "MOYENNE")
        risk_score = anomaly.get("risk_score")
        now = utc_now()

        df = self.read()
        active_mask = (
            df["machine_id"].astype(str).eq(str(machine_id))
            & df["diagnostic_label"].astype(str).eq(label)
            & df["status"].astype(str).str.upper().isin(["ACTIVE", "ACKNOWLEDGED"])
        )

        message = f"{decision}: {label} detecte sur machine {machine_id}"
        if active_mask.any():
            index = df[active_mask].index[0]
            df.loc[index, "occurrence_count"] = int(df.loc[index, "occurrence_count"] or 1) + 1
            df.loc[index, "updated_at"] = now
            df.loc[index, "severity"] = severity
            df.loc[index, "risk_score"] = risk_score
            df.loc[index, "message"] = message
            self.write(df)
            return df.loc[index].to_dict()

        alert_id = int(pd.to_numeric(df["id"], errors="coerce").max() + 1) if not df.empty else 1
        row = {
            "id": alert_id,
            "machine_id": machine_id,
            "diagnostic_label": label,
            "severity": severity,
            "decision": decision,
            "status": "ACTIVE",
            "message": message,
            "risk_score": risk_score,
            "occurrence_count": 1,
            "created_at": now,
            "updated_at": now,
            "resolution_note": "",
        }
        df = pd.concat([df, pd.DataFrame([row])], ignore_index=True)
        self.write(df)
        return row

    def update_status(self, alert_id: int, status: str, resolution_note: str = "") -> dict[str, Any]:
        normalized = status.strip().upper()
        allowed = {"ACTIVE", "ACKNOWLEDGED", "RESOLVED"}
        if normalized not in allowed:
            raise ValueError(f"Statut invalide : {status}")

        df = self.read()
        if df.empty or alert_id not in set(pd.to_numeric(df["id"], errors="coerce").astype("Int64").dropna()):
            raise KeyError(f"Alerte introuvable : {alert_id}")

        mask = pd.to_numeric(df["id"], errors="coerce").eq(alert_id)
        df.loc[mask, "status"] = normalized
        df.loc[mask, "updated_at"] = utc_now()
        if resolution_note:
            df.loc[mask, "resolution_note"] = resolution_note
        self.write(df)
        return df.loc[mask].iloc[0].to_dict()
