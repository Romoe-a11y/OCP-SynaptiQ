import { BrainCircuit, Clock3, Gauge, ShieldAlert } from "lucide-react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import Card from "../../components/common/Card";
import Loader from "../../components/common/Loader";
import ApiError from "../../components/common/ApiError";
import { useApi } from "../../hooks/useApi";
import { getPredictions } from "../../services/dashboardService";

function formatDate(value?: string) {
  if (!value) return "--";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

function badgeClass(level?: string) {
  const value = (level ?? "").toUpperCase();
  if (value.includes("CRIT")) return "data-badge badge-critical";
  if (value.includes("ELEV") || value.includes("MOY") || value.includes("ALER")) return "data-badge badge-alert";
  return "data-badge badge-normal";
}

export default function AdminPredictionsPage() {
  const { data: items, loading, error, reload } = useApi(getPredictions, [], 3_000);

  if (loading) {
    return (
      <DashboardLayout title="Admin Predictions" subtitle="Loading..." roleLabel="Administrator">
        <Loader />
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="Admin Predictions" subtitle="Unable to load" roleLabel="Administrator">
        <ApiError message={error} onRetry={reload} />
      </DashboardLayout>
    );
  }

  const predictions = items ?? [];

  return (
    <DashboardLayout
      title="Admin Predictions"
      subtitle="Persisted prediction audit trail with model metadata and explanations."
      roleLabel="Administrator"
    >
      <Card className="info-card">
        <div className="card-title-row">
          <h3>Prediction register</h3>
        </div>

        <div className="list-stack">
          {predictions.length ? (
            predictions.map((prediction) => (
              <Card key={prediction.id} className="prediction-item">
                <div className="item-meta">
                  <span className={badgeClass(prediction.niveauRisque)}>{prediction.niveauRisque ?? "INFO"}</span>
                  <span className="data-badge">Confidence {prediction.confiance ?? "--"}%</span>
                  <span className="data-badge">Model {prediction.modelName ?? "diagnostic"} v{prediction.modelVersion ?? "--"}</span>
                </div>
                <strong>{prediction.outputLabel ?? prediction.statutPredit ?? "Prediction"}</strong>
                <p>{prediction.explanation ?? "No explanation stored for this prediction."}</p>
                <div className="history-measure-stats">
                  <div className="history-stat-pill">
                    <ShieldAlert size={16} />
                    <span>{prediction.finalDecision ?? "--"}</span>
                  </div>
                  <div className="history-stat-pill">
                    <BrainCircuit size={16} />
                    <span>Anomaly {prediction.anomalyScore ?? "--"}</span>
                  </div>
                  <div className="history-stat-pill">
                    <Gauge size={16} />
                    <span>RUL {prediction.rulDays ?? "--"} d</span>
                  </div>
                  <div className="history-stat-pill">
                    <Clock3 size={16} />
                    <span>{formatDate(prediction.dateCreation)}</span>
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <div className="centered-empty">No predictions available.</div>
          )}
        </div>
      </Card>
    </DashboardLayout>
  );
}
