import { Cpu, TriangleAlert, Activity, Zap } from "lucide-react";
import type { AlerteDashboardDto } from "../../types";

function alertTone(level: string) {
  if (level === "CRITIQUE") return "t-crit";
  if (level === "ALERTE") return "t-warn";
  return "t-vib";
}

function alertBadge(level: string) {
  if (level === "CRITIQUE") return "v2-badge crit";
  if (level === "ALERTE") return "v2-badge warn";
  return "v2-badge ok";
}

function alertIcon(level: string) {
  if (level === "CRITIQUE") return <TriangleAlert size={18} strokeWidth={2.2} />;
  if (level === "ALERTE") return <Activity size={18} strokeWidth={2.2} />;
  return <Zap size={18} strokeWidth={2.2} />;
}

export default function AlertCard({ alert }: { alert: AlerteDashboardDto }) {
  return (
    <div className="v2-alert">
      <span className={`ai ${alertTone(alert.gravite)}`}>
        {alertIcon(alert.gravite)}
      </span>
      <div className="info">
        <b>{alert.message || `Alert #${alert.id}`}</b>
        <span><Cpu size={12} /> {alert.statut}</span>
      </div>
      <span className={alertBadge(alert.gravite)}>{alert.gravite}</span>
    </div>
  );
}
