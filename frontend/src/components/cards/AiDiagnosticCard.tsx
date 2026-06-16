import { Activity, Gauge, ShieldCheck, Siren, Thermometer, TriangleAlert, Wrench, Zap } from "lucide-react";
import type { AiDiagnosticResponse } from "../../types";

interface Props {
  diagnostic: AiDiagnosticResponse;
}

function decisionBadge(decision?: string) {
  if (decision === "ARRET_RECOMMANDE") return "v2-badge crit";
  if (decision === "INTERVENTION_URGENTE") return "v2-badge warn";
  if (decision === "MAINTENANCE_PLANIFIEE") return "v2-badge info";
  return "v2-badge ok";
}

function decisionIcon(decision?: string) {
  if (decision === "ARRET_RECOMMANDE") return <Siren size={18} />;
  if (decision === "INTERVENTION_URGENTE") return <TriangleAlert size={18} />;
  if (decision === "MAINTENANCE_PLANIFIEE") return <Wrench size={18} />;
  return <ShieldCheck size={18} />;
}

function headline(label?: string) {
  switch (label) {
    case "SURCHAUFFE_PROBABLE": return "Probable overheating detected";
    case "USURE_MECANIQUE_PROBABLE": return "Probable mechanical wear detected";
    case "SURCHARGE_ELECTRIQUE_PROBABLE": return "Probable electrical overload detected";
    case "FROTTEMENT_OU_BLOCAGE_PROBABLE": return "Possible friction or blockage detected";
    case "ETAT_CRITIQUE_GENERAL": return "Critical operating condition detected";
    default: return "Normal operating behaviour detected";
  }
}

export default function AiDiagnosticCard({ diagnostic }: Props) {
  return (
    <div className="v2-card v2-card-pad">
      <div className="v2-card-head">
        <div>
          <div className="eyebrow">AI Diagnostic Engine</div>
          <h3>{headline(diagnostic.diagnostic_label)}</h3>
        </div>
        <span className={decisionBadge(diagnostic.decision)}>
          {decisionIcon(diagnostic.decision)}
          {diagnostic.decision.split("_").join(" ")}
        </span>
      </div>

      <div className="v2-gauge-grid">
        <div className="v2-gauge">
          <div className="gl">Diagnostic</div>
          <div className="gv" style={{ fontSize: "1rem" }}>{diagnostic.diagnostic_label.split("_").join(" ")}</div>
        </div>
        <div className="v2-gauge">
          <div className="gl">Probable cause</div>
          <div className="gv" style={{ fontSize: "1rem" }}>{diagnostic.cause_probable}</div>
        </div>
        <div className="v2-gauge">
          <div className="gl">Recommendation</div>
          <div className="gv" style={{ fontSize: "1rem" }}>{diagnostic.recommandation}</div>
        </div>
        <div className="v2-gauge">
          <div className="gl">Decision level</div>
          <div className="gv" style={{ fontSize: "1rem" }}>{diagnostic.decision.split("_").join(" ")}</div>
        </div>
      </div>

      <div className="v2-signals" style={{ marginTop: 16 }}>
        <div className="v2-signal">
          <div className="st"><span className="si t-temp"><Thermometer size={16} strokeWidth={2.2} /></span><span className="sl">Temp</span></div>
          <div className="sv">{diagnostic.input_data.temperature}<small> °C</small></div>
        </div>
        <div className="v2-signal">
          <div className="st"><span className="si t-cur"><Zap size={16} strokeWidth={2.2} /></span><span className="sl">Current</span></div>
          <div className="sv">{diagnostic.input_data.courant}<small> A</small></div>
        </div>
        <div className="v2-signal">
          <div className="st"><span className="si t-vib"><Activity size={16} strokeWidth={2.2} /></span><span className="sl">Vibration</span></div>
          <div className="sv">{diagnostic.input_data.vibration}</div>
        </div>
        <div className="v2-signal">
          <div className="st"><span className="si t-ok"><Gauge size={16} strokeWidth={2.2} /></span><span className="sl">RPM</span></div>
          <div className="sv">{diagnostic.input_data.rpm}</div>
        </div>
      </div>
    </div>
  );
}
