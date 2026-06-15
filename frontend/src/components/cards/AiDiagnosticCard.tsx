import Card from "../common/Card";
import { ShieldCheck, TriangleAlert, Siren, Wrench } from "lucide-react";
import type { AiDiagnosticResponse } from "../../types";

interface Props {
  diagnostic: AiDiagnosticResponse;
}

function getDecisionBadgeClass(decision?: string) {
  if (decision === "ARRET_RECOMMANDE") return "badge-critical";
  if (decision === "INTERVENTION_URGENTE") return "badge-alert";
  if (decision === "MAINTENANCE_PLANIFIEE") return "badge-warning-soft";
  return "badge-normal";
}

function getDecisionIcon(decision?: string) {
  if (decision === "ARRET_RECOMMANDE") return <Siren size={18} />;
  if (decision === "INTERVENTION_URGENTE") return <TriangleAlert size={18} />;
  if (decision === "MAINTENANCE_PLANIFIEE") return <Wrench size={18} />;
  return <ShieldCheck size={18} />;
}

function getHeadline(label?: string) {
  switch (label) {
    case "SURCHAUFFE_PROBABLE":
      return "Probable overheating detected";
    case "USURE_MECANIQUE_PROBABLE":
      return "Probable mechanical wear detected";
    case "SURCHARGE_ELECTRIQUE_PROBABLE":
      return "Probable electrical overload detected";
    case "FROTTEMENT_OU_BLOCAGE_PROBABLE":
      return "Possible friction or blockage detected";
    case "ETAT_CRITIQUE_GENERAL":
      return "Critical operating condition detected";
    default:
      return "Normal operating behaviour detected";
  }
}

export default function AiDiagnosticCard({ diagnostic }: Props) {
  return (
    <Card className="info-card ai-diagnostic-card">
      <div className="card-title-row">
        <div>
          <small className="ai-kicker">AI DIAGNOSTIC ENGINE</small>
          <h3>Intelligent diagnostic summary</h3>
        </div>

        <span className={`data-badge ${getDecisionBadgeClass(diagnostic.decision)}`}>
          <span className="ai-badge-icon">{getDecisionIcon(diagnostic.decision)}</span>
          {diagnostic.decision.split("_").join(" ")}
        </span>
      </div>

      <div className="ai-hero-line">
        <div className="ai-hero-status">{getDecisionIcon(diagnostic.decision)}</div>

        <div>
          <div className="ai-main-title">{getHeadline(diagnostic.diagnostic_label)}</div>
          <p className="ai-main-subtitle">
            Analysis generated from the selected machine state and AI scoring pipeline.
          </p>
        </div>
      </div>

      <div className="ai-diagnostic-grid">
        <div className="ai-diagnostic-block">
          <span className="ai-label">Diagnostic</span>
          <strong>{diagnostic.diagnostic_label.split("_").join(" ")}</strong>
        </div>

        <div className="ai-diagnostic-block">
          <span className="ai-label">Probable cause</span>
          <strong>{diagnostic.cause_probable}</strong>
        </div>

        <div className="ai-diagnostic-block">
          <span className="ai-label">Recommended action</span>
          <strong>{diagnostic.recommandation}</strong>
        </div>

        <div className="ai-diagnostic-block">
          <span className="ai-label">Decision level</span>
          <strong>{diagnostic.decision.split("_").join(" ")}</strong>
        </div>
      </div>

      <div className="ai-signal-strip">
        <div className="ai-signal-item">
          <span>Temp</span>
          <strong>{diagnostic.input_data.temperature} °C</strong>
        </div>
        <div className="ai-signal-item">
          <span>Current</span>
          <strong>{diagnostic.input_data.courant} A</strong>
        </div>
        <div className="ai-signal-item">
          <span>Vibration</span>
          <strong>{diagnostic.input_data.vibration}</strong>
        </div>
        <div className="ai-signal-item">
          <span>RPM</span>
          <strong>{diagnostic.input_data.rpm}</strong>
        </div>
      </div>
    </Card>
  );
}
