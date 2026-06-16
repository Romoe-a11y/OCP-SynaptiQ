import { BrainCircuit, Clock3, Gauge, ShieldAlert, TrendingUp } from "lucide-react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import Loader from "../../components/common/Loader";
import ApiError from "../../components/common/ApiError";
import { useApi } from "../../hooks/useApi";
import { getPredictions } from "../../services/dashboardService";

function formatDate(value?: string) {
  if (!value) return "--";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

function riskTone(level?: string) {
  const v = (level ?? "").toUpperCase();
  if (v.includes("CRIT")) return "t-crit";
  if (v.includes("ELEV") || v.includes("MOY") || v.includes("ALER")) return "t-warn";
  return "t-ok";
}

function riskBadge(level?: string) {
  const v = (level ?? "").toUpperCase();
  if (v.includes("CRIT")) return "v2-badge crit";
  if (v.includes("ELEV") || v.includes("MOY") || v.includes("ALER")) return "v2-badge warn";
  return "v2-badge ok";
}

export default function AdminPredictionsPage() {
  const { data: items, loading, error, reload } = useApi(getPredictions, [], 3_000);

  if (loading) {
    return (
      <DashboardLayout title="Predictions" subtitle="Loading..." roleLabel="Administrator">
        <Loader />
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="Predictions" subtitle="Unable to load" roleLabel="Administrator">
        <ApiError message={error} onRetry={reload} />
      </DashboardLayout>
    );
  }

  const predictions = items ?? [];

  return (
    <DashboardLayout
      title="Predictions"
      subtitle="Persisted prediction audit trail with model metadata and explanations."
      roleLabel="Administrator"
    >
      <div className="v2-card v2-card-pad">
        <div className="v2-card-head" style={{ alignItems: "center" }}>
          <h3>Prediction register</h3>
          <span className="v2-badge neutral">{predictions.length} records</span>
        </div>

        <div className="v2-rows">
          {predictions.length ? (
            predictions.map((prediction) => (
              <div className="v2-row-item" key={prediction.id}>
                <span className={`ri ${riskTone(prediction.niveauRisque)}`}>
                  <TrendingUp size={19} strokeWidth={2.2} />
                </span>
                <div className="body">
                  <b>{prediction.outputLabel ?? prediction.statutPredit ?? "Prediction"}</b>
                  <p>{prediction.explanation ?? "No explanation stored for this prediction."}</p>
                  <div className="meta">
                    <span className={riskBadge(prediction.niveauRisque)}>{prediction.niveauRisque ?? "INFO"}</span>
                    <span className="chip">Confidence {prediction.confiance ?? "--"}%</span>
                    <span className="chip"><BrainCircuit size={12} /> {prediction.modelName ?? "diagnostic"} v{prediction.modelVersion ?? "--"}</span>
                    <span className="chip"><ShieldAlert size={12} /> {prediction.finalDecision ?? "--"}</span>
                    <span className="chip"><Gauge size={12} /> RUL {prediction.rulDays ?? "--"} d</span>
                    <span className="chip"><Clock3 size={12} /> {formatDate(prediction.dateCreation)}</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="v2-empty">No predictions available.</div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
