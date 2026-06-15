import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Cpu,
  FileText,
  Gauge,
  Printer,
  ShieldAlert,
  Thermometer,
  TrendingUp,
  Zap,
  Activity,
} from "lucide-react";

import { useApi } from "../../hooks/useApi";
import { getDashboardData } from "../../services/dashboardService";
import ocpLogo from "../../assets/images/ocp-logo.png";
import type { DashboardResponse } from "../../types";

function formatDate(value?: string) {
  if (!value) return "--";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

function statusColor(status?: string) {
  if (status === "CRITIQUE") return "exec-critical";
  if (status === "ALERTE") return "exec-alert";
  return "exec-normal";
}

function statusLabel(status?: string) {
  if (status === "CRITIQUE") return "Critical";
  if (status === "ALERTE") return "Warning";
  if (status === "NORMAL") return "Normal";
  return status ?? "--";
}

function severityLabel(severity?: string) {
  if (severity === "CRITIQUE" || severity === "ELEVEE") return "High";
  if (severity === "MOYENNE") return "Medium";
  if (severity === "FAIBLE") return "Low";
  return severity ?? "--";
}

function computeKpis(data: DashboardResponse | null) {
  if (!data) return null;

  const alertes = data.alertes ?? [];
  const anomalies = data.anomalies ?? [];
  const predictions = data.predictions ?? [];
  const latestMeasure = data.derniereMesure;

  const totalAlerts = alertes.length;
  const criticalAlerts = alertes.filter(
    (a) => a.gravite === "CRITIQUE" || a.gravite === "ELEVEE"
  ).length;
  const openAlerts = alertes.filter(
    (a) => a.statut === "OPEN" || a.statut === "ACTIVE"
  ).length;
  const anomalyCount = anomalies.length;
  const latestPrediction = predictions[0];

  const status = latestMeasure?.statut;
  let fleetHealth = 100;
  if (status === "CRITIQUE") fleetHealth = 25;
  else if (status === "ALERTE") fleetHealth = 60;
  else if (openAlerts > 0) fleetHealth = 80;

  let riskLevel: "LOW" | "MODERATE" | "HIGH" | "CRITICAL" = "LOW";
  if (criticalAlerts > 0 || status === "CRITIQUE") {
    riskLevel = "CRITICAL";
  } else if (openAlerts > 2 || status === "ALERTE") {
    riskLevel = "HIGH";
  } else if (openAlerts > 0 || anomalyCount > 0) {
    riskLevel = "MODERATE";
  }

  return {
    totalAlerts,
    openAlerts,
    fleetHealth,
    riskLevel,
    latestPrediction,
    latestMeasure,
    recentAlerts: alertes.slice(0, 5),
  };
}

export default function UserReportPage() {
  const navigate = useNavigate();
  const { data, loading } = useApi(getDashboardData, [], 5_000);
  const kpis = useMemo(() => computeKpis(data), [data]);

  const summary = useMemo(() => {
    if (!kpis) return "";
    const { riskLevel, fleetHealth, openAlerts, latestMeasure } = kpis;
    const machine = latestMeasure?.nomMachine ?? "the monitored equipment";

    if (riskLevel === "CRITICAL") {
      return `Immediate attention required. ${machine} is operating in a critical state with ${openAlerts} open alert${openAlerts !== 1 ? "s" : ""}. Fleet health stands at ${fleetHealth}%.`;
    }
    if (riskLevel === "HIGH") {
      return `Elevated risk detected. ${machine} shows warning indicators with ${openAlerts} active alert${openAlerts !== 1 ? "s" : ""}. Fleet health is at ${fleetHealth}%.`;
    }
    if (riskLevel === "MODERATE") {
      return `Moderate operational conditions. Minor anomalies detected. Fleet health is at ${fleetHealth}%.`;
    }
    return `All systems operating within normal parameters. Fleet health is at ${fleetHealth}% with no active alerts.`;
  }, [kpis]);

  useEffect(() => {
    if (!loading && data) {
      const timeout = setTimeout(() => window.print(), 600);
      return () => clearTimeout(timeout);
    }
  }, [loading, data]);

  if (loading) {
    return (
      <div className="report-loading-page">
        <div className="report-loading-box">Preparing report...</div>
      </div>
    );
  }

  const lm = kpis?.latestMeasure;
  const lp = kpis?.latestPrediction;

  return (
    <div className="report-page-wrapper">
      <div className="report-toolbar no-print">
        <button className="report-toolbar-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} strokeWidth={2.2} />
          <span>Back</span>
        </button>
        <button className="report-toolbar-btn primary" onClick={() => window.print()}>
          <Printer size={16} strokeWidth={2.2} />
          <span>Print PDF</span>
        </button>
      </div>

      <main className="report-page exec-report">
        <header className="exec-header">
          <div className="exec-brand">
            <img src={ocpLogo} alt="OCP Group" className="exec-logo" />
            <div>
              <h1 className="exec-title">OCP SynaptiQ</h1>
              <p className="exec-subtitle">Industrial Motor Supervision Platform</p>
            </div>
          </div>
          <div className="exec-report-label">
            <FileText size={18} strokeWidth={2} />
            <span>Operator Report</span>
          </div>
        </header>

        <div className="exec-divider" />

        <section className="exec-meta">
          <div className="exec-meta-item">
            <span className="exec-meta-label">Report date</span>
            <span className="exec-meta-value">{formatDate(new Date().toISOString())}</span>
          </div>
          <div className="exec-meta-item">
            <span className="exec-meta-label">Prepared for</span>
            <span className="exec-meta-value">Operations</span>
          </div>
          <div className="exec-meta-item">
            <span className="exec-meta-label">Primary asset</span>
            <span className="exec-meta-value">{lm?.nomMachine ?? "--"}</span>
          </div>
          <div className="exec-meta-item">
            <span className="exec-meta-label">Current status</span>
            <span className={`exec-meta-value exec-status-text ${statusColor(lm?.statut)}`}>
              {statusLabel(lm?.statut)}
            </span>
          </div>
        </section>

        <section className="exec-kpi-row">
          <div className={`exec-kpi-card exec-risk-${kpis?.riskLevel?.toLowerCase()}`}>
            <div className="exec-kpi-icon">
              <ShieldAlert size={20} strokeWidth={2} />
            </div>
            <div>
              <span className="exec-kpi-label">Risk level</span>
              <strong className="exec-kpi-value">{kpis?.riskLevel ?? "--"}</strong>
            </div>
          </div>
          <div className="exec-kpi-card">
            <div className="exec-kpi-icon health">
              <CheckCircle2 size={20} strokeWidth={2} />
            </div>
            <div>
              <span className="exec-kpi-label">Fleet health</span>
              <strong className="exec-kpi-value">{kpis?.fleetHealth ?? 0}%</strong>
            </div>
          </div>
          <div className="exec-kpi-card">
            <div className="exec-kpi-icon alerts">
              <AlertTriangle size={20} strokeWidth={2} />
            </div>
            <div>
              <span className="exec-kpi-label">Open alerts</span>
              <strong className="exec-kpi-value">{kpis?.openAlerts ?? 0}</strong>
            </div>
          </div>
          <div className="exec-kpi-card">
            <div className="exec-kpi-icon data">
              <Cpu size={20} strokeWidth={2} />
            </div>
            <div>
              <span className="exec-kpi-label">Total alerts</span>
              <strong className="exec-kpi-value">{kpis?.totalAlerts ?? 0}</strong>
            </div>
          </div>
        </section>

        <section className="exec-section">
          <h2 className="exec-section-title">Operational Summary</h2>
          <p className="exec-body-text">{summary}</p>
        </section>

        <section className="exec-section">
          <h2 className="exec-section-title">Latest Sensor Readings</h2>
          <div className="exec-sensor-grid">
            <div className="exec-sensor-card">
              <Thermometer size={18} strokeWidth={2} className="exec-sensor-icon thermal" />
              <span className="exec-sensor-label">Temperature</span>
              <strong className="exec-sensor-value">{lm?.temperature ?? "--"} °C</strong>
            </div>
            <div className="exec-sensor-card">
              <Zap size={18} strokeWidth={2} className="exec-sensor-icon electrical" />
              <span className="exec-sensor-label">Current</span>
              <strong className="exec-sensor-value">{lm?.courant ?? "--"} A</strong>
            </div>
            <div className="exec-sensor-card">
              <Activity size={18} strokeWidth={2} className="exec-sensor-icon vibration" />
              <span className="exec-sensor-label">Vibration</span>
              <strong className="exec-sensor-value">{lm?.vibration ?? "--"}</strong>
            </div>
            <div className="exec-sensor-card">
              <Gauge size={18} strokeWidth={2} className="exec-sensor-icon mechanical" />
              <span className="exec-sensor-label">RPM</span>
              <strong className="exec-sensor-value">{lm?.rpm ?? "--"}</strong>
            </div>
          </div>
        </section>

        <section className="exec-section">
          <h2 className="exec-section-title">Predictive Analysis</h2>
          <div className="exec-prediction-grid">
            <div className="exec-prediction-item">
              <TrendingUp size={16} strokeWidth={2} />
              <span>Predicted status</span>
              <strong className={statusColor(lp?.statutPredit)}>
                {statusLabel(lp?.statutPredit)}
              </strong>
            </div>
            <div className="exec-prediction-item">
              <Cpu size={16} strokeWidth={2} />
              <span>Confidence</span>
              <strong>{lp?.confiance != null ? `${lp.confiance}%` : "--"}</strong>
            </div>
            <div className="exec-prediction-item">
              <ShieldAlert size={16} strokeWidth={2} />
              <span>Risk classification</span>
              <strong>{lp?.niveauRisque ?? "--"}</strong>
            </div>
            <div className="exec-prediction-item">
              <FileText size={16} strokeWidth={2} />
              <span>Data timestamp</span>
              <strong>{formatDate(lm?.horodatage)}</strong>
            </div>
          </div>
        </section>

        <section className="exec-section">
          <h2 className="exec-section-title">Alert Log</h2>
          {kpis?.recentAlerts.length ? (
            <table className="exec-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Severity</th>
                  <th>Status</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {kpis.recentAlerts.map((alert) => (
                  <tr key={alert.id}>
                    <td>#{alert.id}</td>
                    <td>
                      <span className={`exec-severity ${statusColor(alert.gravite)}`}>
                        {severityLabel(alert.gravite)}
                      </span>
                    </td>
                    <td>{alert.statut ?? "--"}</td>
                    <td>{alert.message ?? "Operational alert"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="exec-empty">No alerts recorded in the current monitoring period.</p>
          )}
        </section>

        <footer className="exec-footer">
          <div className="exec-footer-line" />
          <div className="exec-footer-content">
            <span><strong>OCP SynaptiQ</strong> — Confidential</span>
            <span>Generated {formatDate(new Date().toISOString())} — Operator Space</span>
          </div>
        </footer>
      </main>
    </div>
  );
}
