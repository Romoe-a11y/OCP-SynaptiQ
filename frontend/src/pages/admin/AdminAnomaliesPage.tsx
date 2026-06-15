import DashboardLayout from "../../components/layout/DashboardLayout";
import Card from "../../components/common/Card";
import Loader from "../../components/common/Loader";
import ApiError from "../../components/common/ApiError";
import AnomalyCard from "../../components/cards/AnomalyCard";
import { useApi } from "../../hooks/useApi";
import { getAnomalies } from "../../services/dashboardService";

export default function AdminAnomaliesPage() {
  const { data: items, loading, error, reload } = useApi(getAnomalies, [], 3_000);

  if (loading) {
    return (
      <DashboardLayout title="Admin Anomalies" subtitle="Loading..." roleLabel="Administrator">
        <Loader />
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="Admin Anomalies" subtitle="Unable to load" roleLabel="Administrator">
        <ApiError message={error} onRetry={reload} />
      </DashboardLayout>
    );
  }

  const anomalies = items ?? [];

  return (
    <DashboardLayout
      title="Admin Anomalies"
      subtitle="Review deviations detected by the analysis pipeline with severity context."
      roleLabel="Administrator"
    >
      <Card className="info-card">
        <div className="card-title-row">
          <h3>Anomaly register</h3>
        </div>

        <div className="list-stack">
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
            <div className="centered-empty">No anomalies available.</div>
          )}
        </div>
      </Card>
    </DashboardLayout>
  );
}
