import type { AnomalieDashboardDto } from "../../types";
import Card from "../common/Card";

function badgeClass(level: string) {
  if (level === "CRITIQUE") return "data-badge badge-critical";
  if (level === "ALERTE") return "data-badge badge-alert";
  return "data-badge badge-normal";
}

export default function AnomalyCard({ anomaly }: { anomaly: AnomalieDashboardDto }) {
  return (
    <Card className="anomaly-item">
      <div className="item-meta">
        <span className={badgeClass(anomaly.gravite)}>{anomaly.gravite}</span>
        <span className="data-badge">Score {anomaly.score}</span>
      </div>
      <strong>{anomaly.type}</strong>
      <p>{anomaly.description}</p>
    </Card>
  );
}
