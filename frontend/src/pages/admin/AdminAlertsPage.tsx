import { useState } from "react";
import {
  Activity,
  BellRing,
  CheckCircle2,
  ChevronsUp,
  Cpu,
  Flame,
  Thermometer,
  Timer,
  TriangleAlert,
  UserPlus,
  Wrench,
  Zap,
} from "lucide-react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import Loader from "../../components/common/Loader";
import ApiError from "../../components/common/ApiError";
import { useApi } from "../../hooks/useApi";
import { useToast } from "../../contexts/ToastContext";
import {
  acknowledgeAlert,
  assignAlert,
  escalateOverdueAlerts,
  getAlertes,
  resolveAlert,
} from "../../services/dashboardService";

function formatDate(value?: string) {
  if (!value) return "--";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

function severityTone(level?: string) {
  const v = (level ?? "").toUpperCase();
  if (v.includes("CRIT")) return "t-crit";
  if (v.includes("ELEV") || v.includes("MOY") || v.includes("WARN") || v.includes("ALER")) return "t-warn";
  return "t-ok";
}

function severityBadge(level?: string) {
  const v = (level ?? "").toUpperCase();
  if (v.includes("CRIT")) return "v2-badge crit";
  if (v.includes("ELEV") || v.includes("MOY") || v.includes("WARN") || v.includes("ALER") || v.includes("OPEN") || v.includes("ESCAL")) return "v2-badge warn";
  return "v2-badge ok";
}

function severityIcon(level?: string) {
  const v = (level ?? "").toUpperCase();
  if (v.includes("CRIT")) return <Thermometer size={19} strokeWidth={2.2} />;
  if (v.includes("WARN") || v.includes("ALER")) return <Activity size={19} strokeWidth={2.2} />;
  return <CheckCircle2 size={19} strokeWidth={2.2} />;
}

export default function AdminAlertsPage() {
  const { data: items, loading, error, reload } = useApi(getAlertes, [], 3_000);
  const toast = useToast();
  const [technician, setTechnician] = useState("maintenance-team");

  function run(action: Promise<unknown>, label: string) {
    action
      .then(() => { toast.success(label); reload(); })
      .catch((err) => { toast.error(err?.response?.data || err?.message || "Action failed"); });
  }

  if (loading) {
    return (
      <DashboardLayout title="Alerts" subtitle="Loading..." roleLabel="Administrator">
        <Loader />
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="Alerts" subtitle="Unable to load" roleLabel="Administrator">
        <ApiError message={error} onRetry={reload} />
      </DashboardLayout>
    );
  }

  const alerts = items ?? [];
  const openCount = alerts.filter(a => !["RESOLVED", "RESOLU"].includes((a.statut ?? "").toUpperCase())).length;
  const critCount = alerts.filter(a => (a.gravite ?? "").toUpperCase().includes("CRIT")).length;
  const resolvedCount = alerts.filter(a => ["RESOLVED", "RESOLU"].includes((a.statut ?? "").toUpperCase())).length;

  return (
    <DashboardLayout
      title="Alerts"
      subtitle="Database-backed alert lifecycle, assignment and escalation across OCP sites."
      roleLabel="Administrator"
    >
      {/* KPI row */}
      <div className="v2-kpi-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        <div className="v2-kpi">
          <span className="ic t-crit"><BellRing size={18} strokeWidth={2.2} /></span>
          <div className="label">Open alerts</div>
          <div className="value">{openCount}</div>
        </div>
        <div className="v2-kpi">
          <span className="ic t-crit"><Flame size={18} strokeWidth={2.2} /></span>
          <div className="label">Critical</div>
          <div className="value">{critCount}</div>
        </div>
        <div className="v2-kpi">
          <span className="ic t-warn"><Timer size={18} strokeWidth={2.2} /></span>
          <div className="label">SLA breaches</div>
          <div className="value">--</div>
        </div>
        <div className="v2-kpi">
          <span className="ic t-ok"><CheckCircle2 size={18} strokeWidth={2.2} /></span>
          <div className="label">Resolved</div>
          <div className="value">{resolvedCount}</div>
        </div>
      </div>

      {/* Lifecycle controls */}
      <div className="v2-card v2-card-pad">
        <div className="v2-card-head">
          <h3>Lifecycle controls</h3>
          <span className="v2-badge neutral">Assignment</span>
        </div>
        <div className="v2-field-grid">
          <div className="v2-field">
            <label>Assigned technician</label>
            <input
              className="v2-input"
              value={technician}
              onChange={(e) => setTechnician(e.target.value)}
            />
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
          <button type="button" className="v2-btn v2-btn-soft v2-btn-sm" onClick={() => run(escalateOverdueAlerts(), "Overdue alerts escalated")}>
            <ChevronsUp size={16} /> Escalate overdue
          </button>
        </div>
      </div>

      {/* Alert list */}
      <div className="v2-card v2-card-pad">
        <div className="v2-card-head" style={{ alignItems: "center" }}>
          <h3>Alert history</h3>
        </div>

        <div className="v2-rows">
          {alerts.length ? (
            alerts.map((alert) => (
              <div className="v2-row-item" key={alert.id}>
                <span className={`ri ${severityTone(alert.gravite)}`}>
                  {severityIcon(alert.gravite)}
                </span>
                <div className="body">
                  <b>{alert.message || `Alert #${alert.id}`}</b>
                  <div className="meta">
                    <span className={severityBadge(alert.gravite)}>{alert.gravite ?? "INFO"}</span>
                    <span className={severityBadge(alert.statut)}>{alert.statut ?? "N/A"}</span>
                    {alert.machine?.nom && (
                      <span className="chip"><Cpu size={12} /> {alert.machine.nom}</span>
                    )}
                    {alert.assignedTechnician && (
                      <span className="chip">{alert.assignedTechnician}</span>
                    )}
                    {alert.slaDeadline && (
                      <span className="chip"><Timer size={12} /> SLA {formatDate(alert.slaDeadline)}</span>
                    )}
                  </div>
                  {alert.resolutionNotes && <p>{alert.resolutionNotes}</p>}
                </div>
                <div className="v2-row-actions">
                  <button type="button" className="v2-btn v2-btn-soft v2-btn-sm" onClick={() => run(acknowledgeAlert(alert.id), "Alert acknowledged")}>
                    <CheckCircle2 size={15} /> Ack
                  </button>
                  <button type="button" className="v2-btn v2-btn-soft v2-btn-sm" onClick={() => run(assignAlert(alert.id, technician), "Alert assigned")}>
                    <UserPlus size={15} /> Assign
                  </button>
                  <button type="button" className="v2-btn v2-btn-soft v2-btn-sm" onClick={() => run(resolveAlert(alert.id, "dashboard", "Resolved from dashboard"), "Alert resolved")}>
                    <Wrench size={15} /> Resolve
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="v2-empty">No alerts available.</div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
