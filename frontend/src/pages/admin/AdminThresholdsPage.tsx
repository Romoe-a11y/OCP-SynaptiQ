import { useEffect, useState } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import { useToast } from "../../contexts/ToastContext";
import {
  getDecisionThresholds,
  saveDecisionThresholds,
} from "../../services/dashboardService";

type ThresholdState = {
  warningThreshold: number;
  urgentThreshold: number;
  stopThreshold: number;
  tuningGoal: string;
  notes: string;
};

export default function AdminThresholdsPage() {
  const toast = useToast();
  const [savedMessage, setSavedMessage] = useState("");
  const [thresholds, setThresholds] = useState<ThresholdState>({
    warningThreshold: 0.45,
    urgentThreshold: 0.7,
    stopThreshold: 0.85,
    tuningGoal: "BALANCED",
    notes: "",
  });

  useEffect(() => {
    getDecisionThresholds()
      .then((data) =>
        setThresholds({
          warningThreshold: data.warningThreshold,
          urgentThreshold: data.urgentThreshold,
          stopThreshold: data.stopThreshold,
          tuningGoal: data.tuningGoal ?? "BALANCED",
          notes: data.notes ?? "",
        })
      )
      .catch(() => toast.error("Failed to load thresholds"));
  }, []);

  function handleChange(key: keyof ThresholdState, value: string) {
    setThresholds((prev) => ({
      ...prev,
      [key]: key === "tuningGoal" || key === "notes" ? value : Number(value),
    }));
  }

  function handleSave() {
    saveDecisionThresholds(thresholds)
      .then(() => {
        toast.success("Threshold configuration saved");
        setSavedMessage("Threshold configuration saved to PostgreSQL.");
        setTimeout(() => setSavedMessage(""), 2500);
      })
      .catch(() => {
        toast.error("Unable to save thresholds");
        setSavedMessage("Unable to save thresholds.");
        setTimeout(() => setSavedMessage(""), 2500);
      });
  }

  return (
    <DashboardLayout
      title="Admin Thresholds"
      subtitle="Configure business thresholds for warning, urgent and stop decisions."
      roleLabel="Administrator"
    >
      <Card className="info-card threshold-config-card">
        <div className="card-title-row">
          <h3>Decision threshold configuration</h3>
        </div>

        <div className="threshold-grid">
          <label className="quick-action-card threshold-field-card">
            <strong>Warning threshold</strong>
            <input
              type="number"
              min="0"
              max="1"
              step="0.01"
              value={thresholds.warningThreshold}
              onChange={(e) => handleChange("warningThreshold", e.target.value)}
              className="dashboard-input"
            />
          </label>

          <label className="quick-action-card threshold-field-card">
            <strong>Urgent threshold</strong>
            <input
              type="number"
              min="0"
              max="1"
              step="0.01"
              value={thresholds.urgentThreshold}
              onChange={(e) => handleChange("urgentThreshold", e.target.value)}
              className="dashboard-input"
            />
          </label>

          <label className="quick-action-card threshold-field-card">
            <strong>Stop threshold</strong>
            <input
              type="number"
              min="0"
              max="1"
              step="0.01"
              value={thresholds.stopThreshold}
              onChange={(e) => handleChange("stopThreshold", e.target.value)}
              className="dashboard-input"
            />
          </label>

          <label className="quick-action-card threshold-field-card">
            <strong>Tuning goal</strong>
            <select
              value={thresholds.tuningGoal}
              onChange={(e) => handleChange("tuningGoal", e.target.value)}
              className="dashboard-input"
            >
              <option value="BALANCED">Balanced</option>
              <option value="FEWER_FALSE_ALARMS">Fewer false alarms</option>
              <option value="FEWER_MISSED_CRITICAL">Fewer missed critical failures</option>
            </select>
          </label>

          <label className="quick-action-card threshold-field-card threshold-notes-field">
            <strong>Notes</strong>
            <input
              value={thresholds.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
              className="dashboard-input"
            />
          </label>
        </div>

        <p className="threshold-helper-text">
          Higher thresholds reduce false alarms but can delay critical alerts. Lower thresholds catch more failures earlier but increase inspection load.
        </p>

        <div className="footer-actions threshold-action-row">
          <Button variant="secondary" onClick={handleSave}>
            Save thresholds
          </Button>
        </div>

        {savedMessage ? (
          <p className="threshold-save-message">{savedMessage}</p>
        ) : null}
      </Card>
    </DashboardLayout>
  );
}
