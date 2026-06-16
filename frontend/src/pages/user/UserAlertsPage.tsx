import DashboardLayout from "../../components/layout/DashboardLayout";
import Loader from "../../components/common/Loader";
import ApiError from "../../components/common/ApiError";
import AlertCard from "../../components/cards/AlertCard";
import { useApi } from "../../hooks/useApi";
import { getAlertes } from "../../services/dashboardService";

export default function UserAlertsPage() {
  const { data: items, loading, error, reload } = useApi(getAlertes, [], 3_000);

  if (loading) {
    return (
      <DashboardLayout title="Alerts" subtitle="Loading..." roleLabel="Operator">
        <Loader />
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="Alerts" subtitle="Unable to load" roleLabel="Operator">
        <ApiError message={error} onRetry={reload} />
      </DashboardLayout>
    );
  }

  const alerts = items ?? [];

  return (
    <DashboardLayout title="Alerts" subtitle="Recent alerts visible from the operational user area." roleLabel="Operator">
      <div className="v2-card v2-card-pad">
        <div className="v2-card-head" style={{ alignItems: "center" }}>
          <h3>Recent alerts</h3>
          <span className="v2-badge neutral">{alerts.length} records</span>
        </div>
        <div className="v2-rows">
          {alerts.length ? (
            alerts.map((alert) => (
              <AlertCard
                key={alert.id}
                alert={{
                  id: alert.id,
                  message: alert.message,
                  gravite: alert.gravite ?? "INFO",
                  statut: alert.statut ?? "N/A",
                  dateCreation: alert.dateCreation ?? "",
                }}
              />
            ))
          ) : (
            <div className="v2-empty">No alerts available.</div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
