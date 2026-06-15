import { useState } from "react";
import { CheckCircle2, UserPlus, Wrench, ChevronsUp } from "lucide-react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import Card from "../../components/common/Card";
import Loader from "../../components/common/Loader";
import ApiError from "../../components/common/ApiError";
import Button from "../../components/common/Button";
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

function badgeClass(level?: string) {
  const value = (level ?? "").toUpperCase();
  if (value.includes("CRIT")) return "data-badge badge-critical";
  if (value.includes("ELEV") || value.includes("MOY") || value.includes("OPEN") || value.includes("ESCAL")) return "data-badge badge-alert";
  return "data-badge badge-normal";
}

export default function AdminAlertsPage() {
  const { data: items, loading, error, reload } = useApi(getAlertes, [], 3_000);
  const toast = useToast();
  const [technician, setTechnician] = useState("maintenance-team");

  function run(action: Promise<unknown>, label: string) {
    action
      .then(() => {
        toast.success(label);
        reload();
      })
      .catch((err) => {
        toast.error(err?.response?.data || err?.message || "Action failed");
      });
  }

  if (loading) {
    return (
      <DashboardLayout title="Admin Alerts" subtitle="Loading..." roleLabel="Administrator">
        <Loader />
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="Admin Alerts" subtitle="Unable to load" roleLabel="Administrator">
        <ApiError message={error} onRetry={reload} />
      </DashboardLayout>
    );
  }

  const alerts = items ?? [];

  return (
    <DashboardLayout
      title="Admin Alerts"
      subtitle="Database-backed alert lifecycle, assignment and escalation."
      roleLabel="Administrator"
    >
      <div className="stack">
        <Card className="info-card">
          <div className="card-title-row">
            <h3>Lifecycle controls</h3>
            <Button variant="secondary" onClick={() => run(escalateOverdueAlerts(), "Overdue alerts escalated")}>
              <ChevronsUp size={16} />
              Escalate overdue
            </Button>
          </div>
          <label style={{ display: "grid", gap: "0.5rem", maxWidth: 320 }}>
            <strong>Assigned technician</strong>
            <input
              className="dashboard-input"
              value={technician}
              onChange={(event) => setTechnician(event.target.value)}
            />
          </label>
        </Card>

        <Card className="info-card">
          <div className="card-title-row">
            <h3>Alert history</h3>
          </div>

          <div className="list-stack">
            {alerts.length ? (
              alerts.map((alert) => (
                <Card key={alert.id} className="alert-item">
                  <div className="item-meta">
                    <span className={badgeClass(alert.gravite)}>{alert.gravite ?? "INFO"}</span>
                    <span className={badgeClass(alert.statut)}>{alert.statut ?? "N/A"}</span>
                    <span className="data-badge">SLA {formatDate(alert.slaDeadline)}</span>
                  </div>
                  <strong>Alert #{alert.id}</strong>
                  <p>{alert.message}</p>
                  <p style={{ color: "var(--muted)", marginTop: 0 }}>
                    Machine {alert.machine?.nom ?? "--"} · Assigned {alert.assignedTechnician ?? "--"} · Created {formatDate(alert.dateCreation)}
                  </p>
                  {alert.resolutionNotes ? <p>{alert.resolutionNotes}</p> : null}
                  <div className="footer-actions">
                    <Button variant="secondary" onClick={() => run(acknowledgeAlert(alert.id), "Alert acknowledged")}>
                      <CheckCircle2 size={16} />
                      Acknowledge
                    </Button>
                    <Button variant="secondary" onClick={() => run(assignAlert(alert.id, technician), "Alert assigned")}>
                      <UserPlus size={16} />
                      Assign
                    </Button>
                    <Button variant="secondary" onClick={() => run(resolveAlert(alert.id, "dashboard", "Resolved from dashboard"), "Alert resolved")}>
                      <Wrench size={16} />
                      Resolve
                    </Button>
                  </div>
                </Card>
              ))
            ) : (
              <div className="centered-empty">No alerts available.</div>
            )}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
