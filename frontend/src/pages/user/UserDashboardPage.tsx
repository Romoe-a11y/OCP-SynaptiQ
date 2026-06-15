import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  Cpu,
  Gauge,
  ShieldAlert,
  Thermometer,
  TrendingUp,
  Zap,
} from "lucide-react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import AlertCard from "../../components/cards/AlertCard";
import PredictionCard from "../../components/cards/PredictionCard";
import Card from "../../components/common/Card";
import Loader from "../../components/common/Loader";
import ApiError from "../../components/common/ApiError";
import Button from "../../components/common/Button";
import { useApi } from "../../hooks/useApi";
import { getDashboardData, getOperationalDashboard } from "../../services/dashboardService";

function getStatusClass(status?: string) {
  if (status === "NORMAL") return "status-normal";
  if (status === "ALERTE") return "status-alert";
  if (status === "CRITIQUE") return "status-critical";
  return "";
}

function getBadgeClass(status?: string) {
  if (status === "CRITIQUE") return "badge-critical";
  if (status === "ALERTE") return "badge-alert";
  return "badge-normal";
}

function formatDate(value?: string) {
  if (!value) return "--";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString("en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
      });
}

export default function UserDashboardPage() {
  const navigate = useNavigate();

  const { data: bundle, loading, error, reload } = useApi(
    () =>
      Promise.all([getDashboardData(), getOperationalDashboard()]).then(
        ([dashboardData, operationalData]) => ({
          data: dashboardData,
          operational: operationalData,
        }),
      ),
    [],
    3_000, // Auto-refresh every 3 seconds
  );

  const data = bundle?.data ?? null;
  const operational = bundle?.operational ?? null;
  const latestMeasure = data?.derniereMesure;
  const primaryPrediction = data?.predictions?.[0];
  const latestRul = operational?.rulTrend?.[0];
  const latestExplanation = operational?.predictionExplanations?.[0];
  const recentAlerts = data?.alertes?.slice(0, 3) ?? [];
  const status = latestMeasure?.statut ?? "--";

  const helper = useMemo(() => {
    if (status === "CRITIQUE") return "Immediate review recommended";
    if (status === "ALERTE") return "Increased attention required";
    return "System currently nominal";
  }, [status]);

  const topCards = [
    {
      label: "Temperature",
      value: `${latestMeasure?.temperature ?? "--"} °C`,
      helper: "Current thermal signal",
      icon: <Thermometer size={18} strokeWidth={2.2} />,
      toneClass: "temperature-tone",
    },
    {
      label: "Current",
      value: `${latestMeasure?.courant ?? "--"} A`,
      helper: "Current electrical usage",
      icon: <Zap size={18} strokeWidth={2.2} />,
      toneClass: "current-tone",
    },
    {
      label: "Vibration",
      value: `${latestMeasure?.vibration ?? "--"}`,
      helper: "Mechanical intensity",
      icon: <Activity size={18} strokeWidth={2.2} />,
      toneClass: "vibration-tone",
    },
    {
      label: "Motor status",
      value: status,
      helper,
      icon: <ShieldAlert size={18} strokeWidth={2.2} />,
      toneClass:
        status === "CRITIQUE"
          ? "critical-tone"
          : status === "ALERTE"
          ? "warning-tone"
          : "normal-tone",
      statusClass: getStatusClass(status),
    },
  ];

  if (loading) {
    return (
      <DashboardLayout title="User Dashboard" subtitle="Loading..." roleLabel="Operator">
        <Loader />
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="User Dashboard" subtitle="Unable to load" roleLabel="Operator">
        <ApiError message={error} onRetry={reload} />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="User Dashboard"
      subtitle="Simplified visibility on live measures, alerts and prediction output."
      roleLabel="Operator"
    >
      {/* TOP KPI CARDS */}
      <div className="user-kpi-grid">
        {topCards.map((card) => (
          <Card key={card.label} className="info-card compact-kpi-card">
            <div className="compact-kpi-header">
              <div className={`compact-kpi-icon ${card.toneClass}`}>{card.icon}</div>
              <span className="compact-kpi-label">{card.label}</span>
            </div>

            <div className={`compact-kpi-value ${card.statusClass ?? ""}`}>
              {card.value}
            </div>

            <div className="compact-kpi-helper">{card.helper}</div>
          </Card>
        ))}
      </div>

      {/* MAIN CONTENT */}
      <div className="dashboard-grid" style={{ marginTop: "1.2rem" }}>
        {/* LEFT COLUMN */}
        <div className="stack">
          <Card className="info-card" id="live-status">
            <div className="card-title-row">
              <h3>Current machine snapshot</h3>
              <span className={`data-badge ${getBadgeClass(status)}`}>{status}</span>
            </div>

            <div className="user-machine-header">
              <div className="user-machine-icon">
                <Cpu size={20} strokeWidth={2.2} />
              </div>

              <div>
                <div className="user-machine-label">Machine</div>
                <h3 className="user-machine-title">
                  {latestMeasure?.nomMachine ?? "--"}
                </h3>
                <p className="user-machine-date">
                  Timestamp: {formatDate(latestMeasure?.horodatage)}
                </p>
              </div>
            </div>

            <div className="user-snapshot-grid">
              <div className="user-snapshot-tile">
                <div className="user-snapshot-tile-top">
                  <div className="user-snapshot-icon rpm-tone">
                    <Gauge size={18} strokeWidth={2.2} />
                  </div>
                  <span>RPM</span>
                </div>
                <strong>{latestMeasure?.rpm ?? "--"}</strong>
              </div>

              <div className="user-snapshot-tile">
                <div className="user-snapshot-tile-top">
                  <div className="user-snapshot-icon prediction-tone">
                    <TrendingUp size={18} strokeWidth={2.2} />
                  </div>
                  <span>Predicted RUL</span>
                </div>
                <strong>{latestRul?.rulDays != null ? `${String(latestRul.rulDays)} d` : "--"}</strong>
              </div>

              <div className="user-snapshot-tile">
                <div className="user-snapshot-tile-top">
                  <div className="user-snapshot-icon normal-tone">
                    <ShieldAlert size={18} strokeWidth={2.2} />
                  </div>
                  <span>Predicted status</span>
                </div>
                <strong>{primaryPrediction?.statutPredit ?? "--"}</strong>
              </div>

              <div className="user-snapshot-tile">
                <div className="user-snapshot-tile-top">
                  <div className="user-snapshot-icon warning-tone">
                    <Activity size={18} strokeWidth={2.2} />
                  </div>
                  <span>Risk level</span>
                </div>
                <strong>{primaryPrediction?.niveauRisque ?? "--"}</strong>
              </div>
            </div>

            <div className="footer-actions" style={{ marginTop: "1rem" }}>
              <Button variant="secondary" onClick={() => navigate("/user/history")}>
                Open history
              </Button>
              <Button variant="secondary" onClick={() => navigate("/user/motors")}>
                View motors
              </Button>
            </div>
          </Card>
        </div>

        {/* RIGHT COLUMN */}
        <div className="stack">
          <Card className="info-card" id="alerts">
            <div className="card-title-row">
              <h3>Recent alerts</h3>
              <button
                type="button"
                className="card-action-link card-link-button"
                onClick={() => navigate("/user/alerts")}
              >
                View all
              </button>
            </div>

            <div className="list-stack">
              {recentAlerts.length ? (
                recentAlerts.map((alert) => <AlertCard key={alert.id} alert={alert} />)
              ) : (
                <div className="centered-empty">No recent alerts.</div>
              )}
            </div>
          </Card>

          <Card className="info-card" id="prediction">
            <div className="card-title-row">
              <h3>Latest prediction</h3>
              <button
                type="button"
                className="card-action-link card-link-button"
                onClick={() => navigate("/user/predictions")}
              >
                View all
              </button>
            </div>

            <div className="list-stack">
              {primaryPrediction ? (
                <PredictionCard prediction={primaryPrediction} />
              ) : (
                <div className="centered-empty">No prediction available.</div>
              )}
            </div>
          </Card>

          <Card className="info-card">
            <div className="card-title-row">
              <h3>Prediction reason</h3>
              <span className="data-badge">{latestRul?.simulated ? "Simulated RUL" : "Model RUL"}</span>
            </div>
            {latestExplanation ? (
              <p>{String(latestExplanation.explanation ?? "No explanation available.")}</p>
            ) : (
              <div className="centered-empty">No explanation available.</div>
            )}
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
