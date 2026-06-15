import unittest
from datetime import datetime, timedelta

import pandas as pd

from maintenance_core import (
    FEATURE_COLUMNS,
    add_failure_supervision_labels,
    build_feature_profile,
    build_rul_training_frame,
    build_time_series_features,
    compute_drift_report,
    predict_rul,
)


class OperationalMlTests(unittest.TestCase):
    def sensor_frame(self, rows: int = 120) -> pd.DataFrame:
        start = datetime(2026, 1, 1)
        return pd.DataFrame(
            {
                "machine_id": [1] * rows,
                "horodatage": [start + timedelta(minutes=15 * i) for i in range(rows)],
                "temperature": [55 + i * 0.2 for i in range(rows)],
                "courant": [20 + (i % 8) for i in range(rows)],
                "vibration": [0.4 + i * 0.005 for i in range(rows)],
                "couple": [150 + (i % 4) for i in range(rows)],
                "rpm": [1500 - (i % 12) for i in range(rows)],
                "failure_probability": [min(0.95, i / rows) for i in range(rows)],
                "component_health_score": [max(0.1, 1.0 - i / (rows * 1.2)) for i in range(rows)],
            }
        )

    def test_time_series_features_include_1h_6h_24h_windows(self):
        featured = build_time_series_features(self.sensor_frame())

        self.assertIn("temperature_mean_1h", featured.columns)
        self.assertIn("temperature_mean_6h", featured.columns)
        self.assertIn("temperature_mean_24h", featured.columns)
        self.assertIn("courant_abs_mean_24h", featured.columns)
        self.assertFalse(featured[FEATURE_COLUMNS].tail(1).isna().any().any())

    def test_real_failure_history_creates_labels_and_ttf(self):
        sensors = self.sensor_frame()
        failure_history = pd.DataFrame(
            {
                "machine_id": [1],
                "failure_date": [sensors["horodatage"].iloc[-1]],
                "actual_root_cause": ["bearing wear"],
            }
        )

        labelled = add_failure_supervision_labels(sensors, failure_history)

        self.assertIn("time_to_failure_hours", labelled.columns)
        self.assertEqual(labelled["supervised_label"].iloc[-1], "failure")
        self.assertIn("warning", set(labelled["supervised_label"]))
        self.assertIn("critical", set(labelled["supervised_label"]))

    def test_rul_training_frame_uses_real_failure_dates(self):
        sensors = self.sensor_frame()
        failure_history = pd.DataFrame(
            {"machine_id": [1], "failure_date": [sensors["horodatage"].iloc[-1]]}
        )

        frame = build_rul_training_frame(sensors, failure_history)

        self.assertGreater(len(frame), 0)
        self.assertIn("time_to_failure_hours", frame.columns)

    def test_proxy_rul_prediction_is_marked_simulated(self):
        features = build_time_series_features(self.sensor_frame()).tail(1)
        artifact = {"model": None, "feature_columns": FEATURE_COLUMNS, "simulated": True}

        result = predict_rul(artifact, features)

        self.assertTrue(result["simulated"])
        self.assertGreater(result["rul_hours"], 0)

    def test_drift_report_statuses_are_operational(self):
        reference = build_feature_profile(self.sensor_frame(80))
        current = self.sensor_frame(80)
        current["temperature"] = current["temperature"] + 40

        report = compute_drift_report(reference, current)

        self.assertIn(report["status"], {"OK", "WATCH", "DRIFT"})
        self.assertEqual(report["status"], "DRIFT")


if __name__ == "__main__":
    unittest.main()
