import { TriangleAlert } from "lucide-react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import Loader from "../../components/common/Loader";
import ApiError from "../../components/common/ApiError";
import AnomalyCard from "../../components/cards/AnomalyCard";
import { useApi } from "../../hooks/useApi";
import { getAnomalies } from "../../services/dashboardService";

export default function AdminAnomaliesPage() {
  const { data: items, loading, error, reload } = useApi(getAnomalies, [], 3_000);

  if (loading) {
    return (
      <DashboardLayout title="Anomalies" subtitle="Loading..." roleLabel="Administrator">
        <Loader />
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="Anomalies" subtitle="Unable to load" roleLabel="Administrator">
        <ApiError message={error} onRetry={reload} />
      </DashboardLayout>
    );
  }

  const anomalies = items ?? [];
  const critCount = anomalies.filter(a => a.gravite === "CRITIQUE").length;

  return (
    <DashboardLayout
      title="Anomalies"
      subtitle="Review deviations detected by the analysis pipeline with severity context."
      roleLabel="Administrator"
    >
      <div className="v2-kpi-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        <div className="v2-kpi">
          <span className="ic t-warn"><TriangleAlert size={18} strokeWidth={2.2} /></span>
          <div className="label">Total anomalies</div>
          <div className="value">{anomalies.length}</div>
        </div>
        <div className="v2-kpi">
          <span className="ic t-crit"><TriangleAlert size={18} strokeWidth={2.2} /></span>
          <div className="label">Critical</div>
          <div className="value">{critCount}</div>
        </div>
        <div className="v2-kpi">
          <span className="ic t-ok"><TriangleAlert size={18} strokeWidth={2.2} /></span>
          <div className="label">Normal</div>
          <div className="value">{anomalies.length - critCount}</div>
        </div>
      </div>

      <div className="v2-card v2-card-pad">
        <div className="v2-card-head" style={{ alignItems: "center" }}>
          <h3>Anomaly register</h3>
        </div>

        <div className="v2-rows">
          {anomalies.length ? (
            anomalies.map((anomaly) => (
              <AnomalyCard
                key={anomaly.id}
                anomaly={{
                  id: anomaly.id,
                  type: anomaly.type,
                  description: anomaly.description,
                  gravite: anomaly.gravite ?? "INFO",
                  score: anomaly.score ?? 0,
                  dateDetection: anomaly.dateDetection ?? "",
                }}
              />
            ))
          ) : (
            <div className="v2-empty">No anomalies available.</div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
