import { TriangleAlert, Activity, ShieldCheck } from "lucide-react";
import type { AnomalieDashboardDto } from "../../types";

function anomalyTone(level: string) {
  if (level === "CRITIQUE") return "t-crit";
  if (level === "ALERTE") return "t-warn";
  return "t-vib";
}

function anomalyBadge(level: string) {
  if (level === "CRITIQUE") return "v2-badge crit";
  if (level === "ALERTE") return "v2-badge warn";
  return "v2-badge ok";
}

function anomalyIcon(level: string) {
  if (level === "CRITIQUE") return <TriangleAlert size={19} strokeWidth={2.2} />;
  if (level === "ALERTE") return <Activity size={19} strokeWidth={2.2} />;
  return <ShieldCheck size={19} strokeWidth={2.2} />;
}

export default function AnomalyCard({ anomaly }: { anomaly: AnomalieDashboardDto }) {
  return (
    <div className="v2-row-item">
      <span className={`ri ${anomalyTone(anomaly.gravite)}`}>
        {anomalyIcon(anomaly.gravite)}
      </span>
      <div className="body">
        <b>{anomaly.type}</b>
        <p>{anomaly.description}</p>
        <div className="meta">
          <span className={anomalyBadge(anomaly.gravite)}>{anomaly.gravite}</span>
          <span className="chip">Score {anomaly.score}</span>
        </div>
      </div>
    </div>
  );
}
