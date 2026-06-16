import { useMemo } from "react";
import {
  Activity,
  Clock3,
  Cpu,
  Gauge,
  Thermometer,
  Zap,
} from "lucide-react";

import DashboardLayout from "../../components/layout/DashboardLayout";
import Loader from "../../components/common/Loader";
import ApiError from "../../components/common/ApiError";
import { useApi } from "../../hooks/useApi";
import { getRecentMesuresOnly } from "../../services/dashboardService";

function formatDate(value?: string) {
  if (!value) return "--";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

function statusBadge(status?: string) {
  if (status === "CRITIQUE") return "v2-badge crit";
  if (status === "ALERTE") return "v2-badge warn";
  return "v2-badge ok";
}

function statusTone(status?: string) {
  if (status === "CRITIQUE") return "t-crit";
  if (status === "ALERTE") return "t-warn";
  return "t-ok";
}

export default function UserHistoryPage() {
  const { data: items, loading, error, reload } = useApi(getRecentMesuresOnly, [], 5_000);
  const measures = items ?? [];
  const latest = useMemo(() => measures[0], [measures]);

  if (loading) {
    return (
      <DashboardLayout title="History" subtitle="Loading..." roleLabel="Operator">
        <Loader />
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="History" subtitle="Unable to load" roleLabel="Operator">
        <ApiError message={error} onRetry={reload} />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="History"
      subtitle="Recent motor measurements and stored supervision data."
      roleLabel="Operator"
    >
      {/* Latest measure card */}
      <div className="v2-card v2-card-pad">
        <div className="v2-card-head" style={{ alignItems: "center" }}>
          <h3>Latest stored measure</h3>
          {latest?.statut && <span className={statusBadge(latest.statut)}>{latest.statut}</span>}
        </div>

        {latest ? (
          <>
            <div className="v2-asset-head" style={{ marginTop: 12 }}>
              <span className="ic t-green"><Cpu size={20} strokeWidth={2.2} /></span>
              <div>
                <div className="v2-asset-id">{latest.machine?.nom ?? "--"}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: ".82rem", color: "var(--muted)" }}>
                  <Clock3 size={14} /> {formatDate(latest.horodatage)}
                </div>
              </div>
            </div>

            <div className="v2-signals" style={{ marginTop: 16 }}>
              <div className="v2-signal">
                <div className="st"><span className="si t-temp"><Thermometer size={16} strokeWidth={2.2} /></span><span className="sl">Temp</span></div>
                <div className="sv">{latest.temperature ?? "--"}<small> °C</small></div>
              </div>
              <div className="v2-signal">
                <div className="st"><span className="si t-cur"><Zap size={16} strokeWidth={2.2} /></span><span className="sl">Current</span></div>
                <div className="sv">{latest.courant ?? "--"}<small> A</small></div>
              </div>
              <div className="v2-signal">
                <div className="st"><span className="si t-vib"><Activity size={16} strokeWidth={2.2} /></span><span className="sl">Vibration</span></div>
                <div className="sv">{latest.vibration ?? "--"}</div>
              </div>
              <div className="v2-signal">
                <div className="st"><span className="si t-ok"><Gauge size={16} strokeWidth={2.2} /></span><span className="sl">RPM</span></div>
                <div className="sv">{latest.rpm ?? "--"}</div>
              </div>
            </div>
          </>
        ) : (
          <div className="v2-empty">No stored measures available.</div>
        )}
      </div>

      {/* Recent measurements list */}
      <div className="v2-card v2-card-pad">
        <div className="v2-card-head" style={{ alignItems: "center" }}>
          <h3>Recent measurements</h3>
          <span className="v2-badge neutral">{measures.length} records</span>
        </div>

        <div className="v2-rows">
          {measures.length ? (
            measures.map((item) => (
              <div className="v2-row-item" key={item.id}>
                <span className={`ri ${statusTone(item.statut)}`}>
                  <Cpu size={19} strokeWidth={2.2} />
                </span>
                <div className="body">
                  <b>{item.machine?.nom ?? "Machine"}</b>
                  <div className="meta">
                    <span className={statusBadge(item.statut)}>{item.statut ?? "--"}</span>
                    <span className="chip"><Thermometer size={12} /> {item.temperature ?? "--"} °C</span>
                    <span className="chip"><Zap size={12} /> {item.courant ?? "--"} A</span>
                    <span className="chip"><Activity size={12} /> {item.vibration ?? "--"}</span>
                    <span className="chip"><Gauge size={12} /> {item.rpm ?? "--"} RPM</span>
                    <span className="chip"><Clock3 size={12} /> {formatDate(item.horodatage)}</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="v2-empty">No history available.</div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
