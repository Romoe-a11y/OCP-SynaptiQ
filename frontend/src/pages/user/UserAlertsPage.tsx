import DashboardLayout from "../../components/layout/DashboardLayout";
import Card from "../../components/common/Card";
import Loader from "../../components/common/Loader";
import ApiError from "../../components/common/ApiError";
import AlertCard from "../../components/cards/AlertCard";
import { useApi } from "../../hooks/useApi";
import { getAlertes } from "../../services/dashboardService";

export default function UserAlertsPage() {
  const { data: items, loading, error, reload } = useApi(getAlertes, [], 3_000);

  if (loading) {
    return (
      <DashboardLayout title="User Alerts" subtitle="Loading..." roleLabel="Operator">
        <Loader />
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="User Alerts" subtitle="Unable to load" roleLabel="Operator">
        <ApiError message={error} onRetry={reload} />
      </DashboardLayout>
    );
  }

  const alerts = items ?? [];

  return (
    <DashboardLayout title="User Alerts" subtitle="Recent alerts visible from the operational user area." roleLabel="Operator">
      <Card className="info-card">
        <div className="card-title-row"><h3>Recent alerts</h3></div>
        <div className="list-stack">
          {alerts.length ? alerts.map((alert) => <AlertCard key={alert.id} alert={{ id: alert.id, message: alert.message, gravite: alert.gravite ?? "INFO", statut: alert.statut ?? "N/A", dateCreation: alert.dateCreation ?? "" }} />) : <div className="centered-empty">No alerts available.</div>}
        </div>
      </Card>
    </DashboardLayout>
  );
}
