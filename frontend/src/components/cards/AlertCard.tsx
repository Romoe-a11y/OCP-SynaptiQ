import type { AlerteDashboardDto } from "../../types";
import Card from "../common/Card";

function badgeClass(level: string) {
  if (level === "CRITIQUE") return "data-badge badge-critical";
  if (level === "ALERTE") return "data-badge badge-alert";
  return "data-badge badge-normal";
}

export default function AlertCard({ alert }: { alert: AlerteDashboardDto }) {
  return (
    <Card className="alert-item">
      <div className="item-meta">
        <span className={badgeClass(alert.gravite)}>{alert.gravite}</span>
        <span className="data-badge">{alert.statut}</span>
      </div>
      <strong>Alert #{alert.id}</strong>
      <p>{alert.message}</p>
    </Card>
  );
}
