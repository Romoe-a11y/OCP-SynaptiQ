import { useEffect, useState } from "react";
import { Gauge, Save, SlidersHorizontal, Target, TriangleAlert } from "lucide-react";
import DashboardLayout from "../../components/layout/DashboardLayout";
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
  const [saving, setSaving] = useState(false);
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
    setSaving(true);
    saveDecisionThresholds(thresholds)
      .then(() => toast.success("Threshold configuration saved"))
      .catch(() => toast.error("Unable to save thresholds"))
      .finally(() => setSaving(false));
  }

  return (
    <DashboardLayout
      title="Thresholds"
      subtitle="Configure business thresholds for warning, urgent and stop decisions."
      roleLabel="Administrator"
    >
      <div className="v2-kpi-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        <div className="v2-kpi">
          <span className="ic t-warn"><TriangleAlert size={18} strokeWidth={2.2} /></span>
          <div className="label">Warning</div>
          <div className="value">{thresholds.warningThreshold}</div>
        </div>
        <div className="v2-kpi">
          <span className="ic t-crit"><Gauge size={18} strokeWidth={2.2} /></span>
          <div className="label">Urgent</div>
          <div className="value">{thresholds.urgentThreshold}</div>
        </div>
        <div className="v2-kpi">
          <span className="ic t-temp"><Target size={18} strokeWidth={2.2} /></span>
          <div className="label">Stop</div>
          <div className="value">{thresholds.stopThreshold}</div>
        </div>
      </div>

      <div className="v2-card v2-card-pad">
        <div className="v2-card-head">
          <div>
            <div className="eyebrow">Decision Engine</div>
            <h3>Threshold configuration</h3>
          </div>
          <span className="v2-badge neutral">
            <SlidersHorizontal size={14} /> {thresholds.tuningGoal.split("_").join(" ")}
          </span>
        </div>

        <div className="v2-field-grid">
          <div className="v2-field">
            <label>Warning threshold</label>
            <input
              type="number"
              className="v2-input"
              min="0"
              max="1"
              step="0.01"
              value={thresholds.warningThreshold}
              onChange={(e) => handleChange("warningThreshold", e.target.value)}
            />
          </div>

          <div className="v2-field">
            <label>Urgent threshold</label>
            <input
              type="number"
              className="v2-input"
              min="0"
              max="1"
              step="0.01"
              value={thresholds.urgentThreshold}
              onChange={(e) => handleChange("urgentThreshold", e.target.value)}
            />
          </div>

          <div className="v2-field">
            <label>Stop threshold</label>
            <input
              type="number"
              className="v2-input"
              min="0"
              max="1"
              step="0.01"
              value={thresholds.stopThreshold}
              onChange={(e) => handleChange("stopThreshold", e.target.value)}
            />
          </div>

          <div className="v2-field">
            <label>Tuning goal</label>
            <select
              className="v2-input"
              value={thresholds.tuningGoal}
              onChange={(e) => handleChange("tuningGoal", e.target.value)}
            >
              <option value="BALANCED">Balanced</option>
              <option value="FEWER_FALSE_ALARMS">Fewer false alarms</option>
              <option value="FEWER_MISSED_CRITICAL">Fewer missed critical failures</option>
            </select>
          </div>
        </div>

        <div className="v2-field" style={{ marginTop: 16 }}>
          <label>Notes</label>
          <input
            className="v2-input"
            value={thresholds.notes}
            onChange={(e) => handleChange("notes", e.target.value)}
            placeholder="Optional configuration notes..."
          />
        </div>

        <p style={{ fontSize: ".84rem", color: "var(--muted)", marginTop: 12 }}>
          Higher thresholds reduce false alarms but can delay critical alerts. Lower thresholds catch more failures earlier but increase inspection load.
        </p>

        <div style={{ marginTop: 20 }}>
          <button
            type="button"
            className="v2-btn v2-btn-primary"
            onClick={handleSave}
            disabled={saving}
          >
            <Save size={17} />
            {saving ? "Saving..." : "Save thresholds"}
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
