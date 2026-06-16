import DashboardLayout from "../../components/layout/DashboardLayout";
import Loader from "../../components/common/Loader";
import ApiError from "../../components/common/ApiError";
import AnomalyCard from "../../components/cards/AnomalyCard";
import { useApi } from "../../hooks/useApi";
import { getAnomalies } from "../../services/dashboardService";

export default function UserAnomaliesPage() {
  const { data: items, loading, error, reload } = useApi(getAnomalies, [], 3_000);

  if (loading) {
    return (
      <DashboardLayout title="Anomalies" subtitle="Loading..." roleLabel="Operator">
        <Loader />
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="Anomalies" subtitle="Unable to load" roleLabel="Operator">
        <ApiError message={error} onRetry={reload} />
      </DashboardLayout>
    );
  }

  const anomalies = items ?? [];

  return (
    <DashboardLayout title="Anomalies" subtitle="Readable anomaly summaries for day-to-day operational consultation." roleLabel="Operator">
      <div className="v2-card v2-card-pad">
        <div className="v2-card-head" style={{ alignItems: "center" }}>
          <h3>Detected anomalies</h3>
          <span className="v2-badge neutral">{anomalies.length} records</span>
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
