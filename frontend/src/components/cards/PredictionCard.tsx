import { TrendingUp } from "lucide-react";
import type { PredictionDashboardDto } from "../../types";

function riskTone(level?: string) {
  const v = (level ?? "").toUpperCase();
  if (v.includes("CRIT")) return "t-crit";
  if (v.includes("ELEV") || v.includes("MOY") || v.includes("ALER")) return "t-warn";
  return "t-ok";
}

function riskBadge(level?: string) {
  const v = (level ?? "").toUpperCase();
  if (v.includes("CRIT")) return "v2-badge crit";
  if (v.includes("ELEV") || v.includes("MOY") || v.includes("ALER")) return "v2-badge warn";
  return "v2-badge ok";
}

export default function PredictionCard({
  prediction,
}: {
  prediction: PredictionDashboardDto;
}) {
  return (
    <div className="v2-row-item">
      <span className={`ri ${riskTone(prediction.niveauRisque)}`}>
        <TrendingUp size={19} strokeWidth={2.2} />
      </span>
      <div className="body">
        <b>{prediction.statutPredit}</b>
        <p>Motor status projection and risk level computed from sensor data flow.</p>
        <div className="meta">
          <span className={riskBadge(prediction.niveauRisque)}>{prediction.niveauRisque}</span>
          <span className="chip">Confidence {prediction.confiance}%</span>
        </div>
      </div>
    </div>
  );
}
