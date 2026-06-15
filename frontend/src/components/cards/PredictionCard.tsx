import type { PredictionDashboardDto } from "../../types";
import Card from "../common/Card";

function badgeClass(level: string) {
  if (level === "CRITIQUE") return "data-badge badge-critical";
  if (level === "ALERTE") return "data-badge badge-alert";
  return "data-badge badge-normal";
}

export default function PredictionCard({
  prediction
}: {
  prediction: PredictionDashboardDto;
}) {
  return (
    <Card className="prediction-item">
      <div className="item-meta">
        <span className={badgeClass(prediction.niveauRisque)}>{prediction.niveauRisque}</span>
        <span className="data-badge">Confidence {prediction.confiance}%</span>
      </div>
      <strong>{prediction.statutPredit}</strong>
      <p>Projection du statut moteur et niveau de risque calculé à partir du flux de données.</p>
    </Card>
  );
}
