import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  ArrowRight,
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
import Loader from "../../components/common/Loader";
import ApiError from "../../components/common/ApiError";
import { useApi } from "../../hooks/useApi";
import { getDashboardData, getOperationalDashboard } from "../../services/dashboardService";

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
    3_000,
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

  if (loading) {
    return (
      <DashboardLayout title="Dashboard" subtitle="Loading..." roleLabel="Operator">
        <Loader />
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="Dashboard" subtitle="Unable to load" roleLabel="Operator">
        <ApiError message={error} onRetry={reload} />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Dashboard"
      subtitle="Simplified visibility on live measures, alerts and prediction output."
      roleLabel="Operator"
    >
      {/* KPI strip */}
      <div className="v2-kpi-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        <div className="v2-kpi">
          <span className="ic t-temp"><Thermometer size={18} strokeWidth={2.2} /></span>
          <div className="label">Temperature</div>
          <div className="value">{latestMeasure?.temperature ?? "--"}<small> °C</small></div>
        </div>
        <div className="v2-kpi">
          <span className="ic t-cur"><Zap size={18} strokeWidth={2.2} /></span>
          <div className="label">Current</div>
          <div className="value">{latestMeasure?.courant ?? "--"}<small> A</small></div>
        </div>
        <div className="v2-kpi">
          <span className="ic t-vib"><Activity size={18} strokeWidth={2.2} /></span>
          <div className="label">Vibration</div>
          <div className="value">{latestMeasure?.vibration ?? "--"}</div>
        </div>
        <div className="v2-kpi">
          <span className={`ic ${status === "CRITIQUE" ? "t-crit" : status === "ALERTE" ? "t-warn" : "t-ok"}`}>
            <ShieldAlert size={18} strokeWidth={2.2} />
          </span>
          <div className="label">Motor status</div>
          <div className="value" style={{ fontSize: "1.1rem" }}>{status}</div>
          <div style={{ fontSize: ".76rem", color: "var(--muted)" }}>{helper}</div>
        </div>
      </div>

      {/* Main grid */}
      <div className="v2-grid-2">
        {/* Left — Machine snapshot */}
        <div className="v2-card v2-card-pad">
          <div className="v2-card-head" style={{ alignItems: "center" }}>
            <h3>Current machine snapshot</h3>
            <span className={statusBadge(status)}>{status}</span>
          </div>

          <div className="v2-asset-head" style={{ marginTop: 12 }}>
            <span className="ic t-green"><Cpu size={20} strokeWidth={2.2} /></span>
            <div>
              <div className="v2-asset-id">{latestMeasure?.nomMachine ?? "--"}</div>
              <div style={{ fontSize: ".82rem", color: "var(--muted)" }}>
                Timestamp: {formatDate(latestMeasure?.horodatage)}
              </div>
            </div>
          </div>

          <div className="v2-signals" style={{ marginTop: 16 }}>
            <div className="v2-signal">
              <div className="st"><span className="si t-vib"><Gauge size={16} strokeWidth={2.2} /></span><span className="sl">RPM</span></div>
              <div className="sv">{latestMeasure?.rpm ?? "--"}</div>
            </div>
            <div className="v2-signal">
              <div className="st"><span className="si t-purple"><TrendingUp size={16} strokeWidth={2.2} /></span><span className="sl">Predicted RUL</span></div>
              <div className="sv">{latestRul?.rulDays != null ? `${latestRul.rulDays} d` : "--"}</div>
            </div>
            <div className="v2-signal">
              <div className="st"><span className="si t-ok"><ShieldAlert size={16} strokeWidth={2.2} /></span><span className="sl">Predicted status</span></div>
              <div className="sv">{primaryPrediction?.statutPredit ?? "--"}</div>
            </div>
            <div className="v2-signal">
              <div className="st"><span className="si t-warn"><ShieldAlert size={16} strokeWidth={2.2} /></span><span className="sl">Risk level</span></div>
              <div className="sv">{primaryPrediction?.niveauRisque ?? "--"}</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
            <button type="button" className="v2-btn v2-btn-soft v2-btn-sm" onClick={() => navigate("/user/history")}>
              Open history <ArrowRight size={14} />
            </button>
            <button type="button" className="v2-btn v2-btn-soft v2-btn-sm" onClick={() => navigate("/user/motors")}>
              View motors <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {/* Right — Alerts + Prediction */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="v2-card v2-card-pad">
            <div className="v2-card-head" style={{ alignItems: "center" }}>
              <h3>Recent alerts</h3>
              <button type="button" className="v2-link-btn" onClick={() => navigate("/user/alerts")}>View all</button>
            </div>
            <div className="v2-rows">
              {recentAlerts.length ? (
                recentAlerts.map((alert) => <AlertCard key={alert.id} alert={alert} />)
              ) : (
                <div className="v2-empty">No recent alerts.</div>
              )}
            </div>
          </div>

          <div className="v2-card v2-card-pad">
            <div className="v2-card-head" style={{ alignItems: "center" }}>
              <h3>Latest prediction</h3>
              <button type="button" className="v2-link-btn" onClick={() => navigate("/user/predictions")}>View all</button>
            </div>
            <div className="v2-rows">
              {primaryPrediction ? (
                <PredictionCard prediction={primaryPrediction} />
              ) : (
                <div className="v2-empty">No prediction available.</div>
              )}
            </div>
          </div>

          <div className="v2-card v2-card-pad">
            <div className="v2-card-head" style={{ alignItems: "center" }}>
              <h3>Prediction reason</h3>
              <span className="v2-badge neutral">{latestRul?.simulated ? "Simulated RUL" : "Model RUL"}</span>
            </div>
            {latestExplanation ? (
              <p style={{ fontSize: ".88rem", color: "var(--muted)", margin: "8px 0 0" }}>
                {String(latestExplanation.explanation ?? "No explanation available.")}
              </p>
            ) : (
              <div className="v2-empty">No explanation available.</div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
