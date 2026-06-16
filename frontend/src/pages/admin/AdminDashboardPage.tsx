import type { ReactNode } from "react";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  BarChart3,
  BellRing,
  BrainCircuit,
  Cpu,
  Database,
  Gauge,
  Info,
  Server,
  ShieldCheck,
  Thermometer,
  Timer,
  TriangleAlert,
  Zap,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import AlertCard from "../../components/cards/AlertCard";
import Loader from "../../components/common/Loader";
import ApiError from "../../components/common/ApiError";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { useApi } from "../../hooks/useApi";
import {
  getDashboardData,
  getDashboardStats,
  getOperationalDashboard,
  getRecentMeasures,
} from "../../services/dashboardService";
import type {
  DashboardResponse,
  DashboardStats,
  MesureDashboard,
  OperationalDashboardResponse,
} from "../../types";

const chartColors = {
  temperature: "#b8473d",
  current: "#9a6b14",
  vibration: "#2f6aa8",
  rpm: "#237246",
  alert: "#256f4c",
};

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

function formatShortTime(value?: string) {
  if (!value) return "--";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      });
}

function statusBadge(status?: string) {
  if (status === "CRITIQUE") return "v2-badge crit";
  if (status === "ALERTE") return "v2-badge warn";
  return "v2-badge ok";
}

function getSeverityValue(alert: any) {
  return (
    alert?.gravite ??
    alert?.niveau ??
    alert?.severity ??
    alert?.statut ??
    "UNKNOWN"
  );
}

function normalizeSeverity(value?: string) {
  const normalized = (value ?? "").toUpperCase();
  if (normalized.includes("CRIT")) return "Critical";
  if (normalized.includes("ALER") || normalized.includes("WARN")) return "Warning";
  if (normalized.includes("NORM")) return "Normal";
  return "Other";
}

function toFiniteNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function formatDays(value: unknown) {
  const number = toFiniteNumber(value);
  if (number == null) return "--";
  return `${number >= 10 ? number.toFixed(0) : number.toFixed(1)} d`;
}

function formatPercent(value: unknown) {
  const number = toFiniteNumber(value);
  if (number == null) return "--";
  return `${Math.round(number)}%`;
}

function sanitizeExplanation(value?: unknown) {
  const text = String(value ?? "").trim();
  if (!text) return "No model explanation has been stored for the latest prediction.";

  const technicalFailure =
    /AI endpoint failed|connection refused|localhost:5001|I\/O error|getsockopt|POST request/i.test(text);

  if (technicalFailure) {
    return "AI explanation service is currently unavailable. The dashboard is showing the fallback decision, but a detailed model explanation will require the AI service to be restored.";
  }

  return text;
}

function parseMetrics(metricsJson: unknown) {
  if (!metricsJson || typeof metricsJson !== "string") return [];
  try {
    const parsed = JSON.parse(metricsJson) as Record<string, unknown>;
    return Object.entries(parsed)
      .filter(([, value]) => typeof value === "number" || typeof value === "string")
      .slice(0, 4)
      .map(([key, value]) => ({
        label: key.replace(/_/g, " "),
        value: typeof value === "number" ? value.toFixed(3) : String(value),
      }));
  } catch {
    return [];
  }
}

function CustomChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name?: string; color?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-title">{label}</div>
      {payload.map((entry, index) => (
        <div className="chart-tooltip-row" key={`${entry.name}-${index}`}>
          <span
            className="chart-tooltip-dot"
            style={{ background: entry.color ?? chartColors.alert }}
          />
          <span>{entry.name}</span>
          <strong>{entry.value}</strong>
        </div>
      ))}
    </div>
  );
}

export default function AdminDashboardPage() {
  const navigate = useNavigate();

  const { data: bundle, loading, error, reload } = useApi(
    () =>
      Promise.all([
        getDashboardData(),
        getDashboardStats(),
        getRecentMeasures(),
        getOperationalDashboard(),
      ]).then(([dashboardData, dashboardStats, measures, operationalData]) => ({
        data: dashboardData,
        stats: dashboardStats,
        recentMeasures: measures,
        operational: operationalData,
      })),
    [],
    3_000,
  );

  const data = bundle?.data ?? null;
  const stats = bundle?.stats ?? null;
  const recentMeasures = bundle?.recentMeasures ?? [];
  const operational = bundle?.operational ?? null;

  const latestMeasure = data?.derniereMesure ?? null;
  const status = latestMeasure?.statut ?? "--";
  const recentAlerts = data?.alertes?.slice(0, 3) ?? [];

  const avgTemp = useMemo(() => {
    if (!recentMeasures.length) return null;
    return (
      recentMeasures.reduce((acc, measure) => acc + (measure.temperature ?? 0), 0) /
      recentMeasures.length
    ).toFixed(1);
  }, [recentMeasures]);

  const temperatureTrendData = useMemo(() => {
    return [...recentMeasures]
      .sort(
        (a, b) =>
          new Date(a.horodatage ?? "").getTime() -
          new Date(b.horodatage ?? "").getTime()
      )
      .slice(-8)
      .map((measure, index) => ({
        label:
          formatShortTime(measure.horodatage) !== "--"
            ? formatShortTime(measure.horodatage)
            : `P${index + 1}`,
        temperature: Number(measure.temperature ?? 0),
      }));
  }, [recentMeasures]);

  const alertSeverityData = useMemo(() => {
    const counts = { Critical: 0, Warning: 0, Normal: 0, Other: 0 };
    (data?.alertes ?? []).forEach((alert: any) => {
      const severity = normalizeSeverity(getSeverityValue(alert));
      counts[severity as keyof typeof counts] += 1;
    });
    return [
      { label: "Critical", value: counts.Critical },
      { label: "Warning", value: counts.Warning },
      { label: "Normal", value: counts.Normal },
    ];
  }, [data]);

  const anomalyTrendData = useMemo(() => {
    return [...(operational?.anomalyScoreTrend ?? [])]
      .reverse()
      .slice(-12)
      .map((item, index) => ({
        label:
          formatShortTime(String(item.timestamp ?? "")) !== "--"
            ? formatShortTime(String(item.timestamp ?? ""))
            : `P${index + 1}`,
        anomalyScore: Number(item.anomalyScore ?? 0),
      }));
  }, [operational]);

  const rulTrendData = useMemo(() => {
    return [...(operational?.rulTrend ?? [])]
      .reverse()
      .slice(-12)
      .map((item, index) => ({
        label:
          formatShortTime(String(item.timestamp ?? "")) !== "--"
            ? formatShortTime(String(item.timestamp ?? ""))
            : `R${index + 1}`,
        rulDays: Number(item.rulDays ?? 0),
      }));
  }, [operational]);

  const featureTrendData = useMemo(() => {
    return [...(operational?.featureTrends ?? [])]
      .reverse()
      .slice(-12)
      .map((item, index) => ({
        label:
          formatShortTime(String(item.timestamp ?? "")) !== "--"
            ? formatShortTime(String(item.timestamp ?? ""))
            : `S${index + 1}`,
        temperature: Number(item.temperature ?? 0),
        courant: Number(item.courant ?? 0),
        vibration: Number(item.vibration ?? 0),
        rpm: Number(item.rpm ?? 0),
      }));
  }, [operational]);

  const latestExplanation = operational?.predictionExplanations?.[0];
  const driftStatus = String(operational?.driftHealth?.status ?? "NO_DATA");
  const modelStatus = String(operational?.modelHealth?.status ?? "development");
  const latestRul = operational?.rulTrend?.[0];
  const latestRulDays = latestRul?.rulDays;
  const latestRulConfidence = latestRul?.confidence;
  const hasRulTrend = rulTrendData.length >= 2 && rulTrendData.some((item) => item.rulDays > 0);
  const predictionExplanation = sanitizeExplanation(latestExplanation?.explanation);
  const predictionUsesFallback = /fallback|unavailable/i.test(predictionExplanation);
  const modelMetrics = parseMetrics(operational?.modelHealth?.metricsJson);

  if (loading) {
    return (
      <DashboardLayout title="Dashboard" subtitle="Loading data..." roleLabel="Administrator">
        <Loader />
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="Dashboard" subtitle="Unable to load data" roleLabel="Administrator">
        <ApiError message={error} onRetry={reload} />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Overview"
      subtitle="Live motor health, anomaly flow and operational risk."
      roleLabel="Administrator"
    >
      {/* ── KPI GRID ── */}
      <div className="v2-kpi-grid">
        <div className="v2-kpi">
          <span className="ic t-vib"><BarChart3 size={18} strokeWidth={2.2} /></span>
          <div className="label">Measures</div>
          <div className="value">{stats?.totalMesures ?? "--"}</div>
        </div>
        <div className="v2-kpi">
          <span className="ic t-crit"><BellRing size={18} strokeWidth={2.2} /></span>
          <div className="label">Active alerts</div>
          <div className="value">{stats?.totalAlertesActives ?? "--"}</div>
        </div>
        <div className="v2-kpi">
          <span className="ic t-warn"><TriangleAlert size={18} strokeWidth={2.2} /></span>
          <div className="label">Anomalies</div>
          <div className="value">{stats?.totalAnomalies ?? "--"}</div>
        </div>
        <div className="v2-kpi">
          <span className="ic t-temp"><Thermometer size={18} strokeWidth={2.2} /></span>
          <div className="label">Avg temperature</div>
          <div className="value">{avgTemp ? <>{avgTemp}<small> °C</small></> : "--"}</div>
        </div>
        <div className="v2-kpi">
          <span className={`ic ${driftStatus === "DRIFT" ? "t-crit" : "t-ok"}`}>
            <ShieldCheck size={18} strokeWidth={2.2} />
          </span>
          <div className="label">Drift health</div>
          <div className="value" style={{ fontSize: "1.15rem" }}>{driftStatus}</div>
        </div>
        <div className="v2-kpi">
          <span className="ic t-purple"><BrainCircuit size={18} strokeWidth={2.2} /></span>
          <div className="label">Model health</div>
          <div className="value" style={{ fontSize: "1.15rem" }}>{modelStatus}</div>
        </div>
      </div>

      {/* ── MAIN 2-COL GRID ── */}
      <div className="v2-grid-2">
        <div className="v2-stack">
          {/* Monitored asset */}
          <div className="v2-card v2-card-pad">
            <div className="v2-asset-head">
              <div className="v2-asset-id">
                <span className="ai t-green"><Cpu size={23} strokeWidth={2.2} /></span>
                <div>
                  <div className="meta">Monitored asset</div>
                  <h3>{latestMeasure?.nomMachine ?? "--"}</h3>
                  <div className="upd">Updated {formatDate(latestMeasure?.horodatage)}</div>
                </div>
              </div>
              <span className={statusBadge(status)}>{status}</span>
            </div>

            <div className="v2-signals">
              <div className="v2-signal">
                <div className="st"><span className="si t-temp"><Thermometer size={16} strokeWidth={2.2} /></span><span className="sl">Temp</span></div>
                <div className="sv">{latestMeasure?.temperature ?? "--"}<small> °C</small></div>
              </div>
              <div className="v2-signal">
                <div className="st"><span className="si t-cur"><Zap size={16} strokeWidth={2.2} /></span><span className="sl">Current</span></div>
                <div className="sv">{latestMeasure?.courant ?? "--"}<small> A</small></div>
              </div>
              <div className="v2-signal">
                <div className="st"><span className="si t-vib"><Activity size={16} strokeWidth={2.2} /></span><span className="sl">Vibration</span></div>
                <div className="sv">{latestMeasure?.vibration ?? "--"}</div>
              </div>
              <div className="v2-signal">
                <div className="st"><span className="si t-ok"><Gauge size={16} strokeWidth={2.2} /></span><span className="sl">Speed</span></div>
                <div className="sv">{latestMeasure?.rpm ?? "--"}<small> rpm</small></div>
              </div>
            </div>

            <div className="v2-asset-foot">
              <Database size={15} strokeWidth={2.1} />
              {recentMeasures.length} recent samples loaded
            </div>
          </div>

          {/* Temperature chart */}
          <div className="v2-card v2-card-pad">
            <div className="v2-card-head">
              <div>
                <div className="eyebrow">Trend</div>
                <h3>Temperature evolution</h3>
              </div>
              <span className="ci t-temp"><Thermometer size={18} strokeWidth={2.2} /></span>
            </div>
            <div className="chart-shell">
              <ResponsiveContainer>
                <LineChart data={temperatureTrendData}>
                  <CartesianGrid stroke="rgba(23,33,27,.08)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#5d6c63" }} />
                  <YAxis tick={{ fontSize: 12, fill: "#5d6c63" }} />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Line type="monotone" dataKey="temperature" name="Temperature" stroke={chartColors.temperature} strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="v2-stack">
          {/* Alerts by severity */}
          <div className="v2-card v2-card-pad">
            <div className="v2-card-head">
              <div>
                <div className="eyebrow">Distribution</div>
                <h3>Alerts by severity</h3>
              </div>
              <span className="ci t-crit"><BellRing size={18} strokeWidth={2.2} /></span>
            </div>
            <div className="chart-shell">
              <ResponsiveContainer>
                <BarChart data={alertSeverityData}>
                  <CartesianGrid stroke="rgba(23,33,27,.08)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#5d6c63" }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#5d6c63" }} />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Bar dataKey="value" name="Alerts" fill={chartColors.alert} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent alerts */}
          <div className="v2-card v2-card-pad">
            <div className="v2-card-head" style={{ alignItems: "center" }}>
              <h3>Recent alerts</h3>
              <button type="button" className="v2-link-btn" onClick={() => navigate("/admin/alerts")}>
                View all
              </button>
            </div>
            <div className="v2-alerts">
              {recentAlerts.length ? (
                recentAlerts.map((alert) => (
                  <AlertCard key={alert.id} alert={alert} />
                ))
              ) : (
                <div className="v2-empty">No alerts currently available.</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── BOTTOM 3-COL GRID ── */}
      <div className="v2-grid-3">
        {/* RUL trend */}
        <div className="v2-card v2-card-pad">
          <div className="v2-card-head" style={{ alignItems: "center" }}>
            <h3>RUL trend</h3>
            <span className="v2-badge neutral">
              {operational?.rulTrend?.[0]?.simulated ? "Simulated" : "Model"}
            </span>
          </div>
          {hasRulTrend ? (
            <>
              <div className="v2-summary-row">
                <div className="v2-summary-box">
                  <span>Latest remaining life</span>
                  <strong>{formatDays(latestRulDays)}</strong>
                </div>
                <div className="v2-summary-box">
                  <span>Confidence</span>
                  <strong>{formatPercent(latestRulConfidence)}</strong>
                </div>
              </div>
              <div className="chart-shell chart-shell-sm">
                <ResponsiveContainer>
                  <LineChart data={rulTrendData}>
                    <CartesianGrid stroke="rgba(23,33,27,.08)" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#5d6c63" }} />
                    <YAxis tick={{ fontSize: 12, fill: "#5d6c63" }} />
                    <Tooltip content={<CustomChartTooltip />} />
                    <Line type="monotone" dataKey="rulDays" name="RUL days" stroke={chartColors.vibration} strokeWidth={3} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : (
            <div className="v2-empty">
              <div>
                <Timer size={22} strokeWidth={2.1} />
                <strong style={{ display: "block", marginTop: 8 }}>RUL history not ready</strong>
                <p style={{ marginTop: 4 }}>
                  Remaining-life trend needs at least two valid model outputs.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Anomaly score trend */}
        <div className="v2-card v2-card-pad">
          <div className="v2-card-head" style={{ alignItems: "center" }}>
            <h3>Anomaly score trend</h3>
            <span className={driftStatus === "DRIFT" ? "v2-badge crit" : "v2-badge ok"}>
              Drift {driftStatus}
            </span>
          </div>
          <div className="chart-shell chart-shell-sm">
            <ResponsiveContainer>
              <LineChart data={anomalyTrendData}>
                <CartesianGrid stroke="rgba(23,33,27,.08)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#5d6c63" }} />
                <YAxis tick={{ fontSize: 12, fill: "#5d6c63" }} />
                <Tooltip content={<CustomChartTooltip />} />
                <Line type="monotone" dataKey="anomalyScore" name="Anomaly score" stroke={chartColors.temperature} strokeWidth={3} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Feature trends */}
        <div className="v2-card v2-card-pad">
          <div className="v2-card-head" style={{ alignItems: "center" }}>
            <h3>Feature trends</h3>
          </div>
          <div className="chart-shell">
            <ResponsiveContainer>
              <LineChart data={featureTrendData}>
                <CartesianGrid stroke="rgba(23,33,27,.08)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#5d6c63" }} />
                <YAxis tick={{ fontSize: 12, fill: "#5d6c63" }} />
                <Tooltip content={<CustomChartTooltip />} />
                <Line type="monotone" dataKey="temperature" name="Temperature" stroke={chartColors.temperature} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="courant" name="Current" stroke={chartColors.current} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="vibration" name="Vibration" stroke={chartColors.vibration} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="rpm" name="RPM" stroke={chartColors.rpm} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Prediction explanation */}
        <div className="v2-card v2-card-pad">
          <div className="v2-card-head" style={{ alignItems: "center" }}>
            <h3>Prediction explanation</h3>
            <span className={`v2-badge ${predictionUsesFallback ? "warn" : "ok"}`}>
              <Timer size={13} />
              {predictionUsesFallback ? "Fallback" : latestExplanation?.timestamp
                ? formatDate(String(latestExplanation.timestamp))
                : "No data"}
            </span>
          </div>
          {latestExplanation ? (
            <>
              <div className="v2-explain">
                <span>Predicted condition</span>
                <strong>{String(latestExplanation.label ?? "Latest prediction")}</strong>
                <p>{String(latestExplanation.decision ?? "No decision recorded")}</p>
              </div>
              <div className={predictionUsesFallback ? "v2-note warning" : "v2-note"}>
                <Info size={16} strokeWidth={2.1} />
                <p>{predictionExplanation}</p>
              </div>
            </>
          ) : (
            <div className="v2-empty">No prediction explanation available.</div>
          )}
        </div>

        {/* Active machine status */}
        <div className="v2-card v2-card-pad">
          <div className="v2-card-head" style={{ alignItems: "center" }}>
            <h3>Active machine status</h3>
          </div>
          {(operational?.activeMachineStatus ?? []).length ? (
            (operational?.activeMachineStatus ?? []).slice(0, 6).map((machine) => (
              <div className="v2-machine-row" key={String(machine.id)}>
                <div>
                  <h4>{String(machine.name ?? "--")}</h4>
                  <p>{String(machine.location ?? "--")}</p>
                </div>
                <span className={statusBadge(String(machine.status ?? ""))}>{String(machine.status ?? "--")}</span>
              </div>
            ))
          ) : (
            <div className="v2-empty">No active machine status available.</div>
          )}
        </div>

        {/* Model health */}
        <div className="v2-card v2-card-pad">
          <div className="v2-card-head" style={{ alignItems: "center" }}>
            <h3>Model health</h3>
            <span className="v2-badge neutral">
              {String(operational?.modelHealth?.status ?? "development")}
            </span>
          </div>

          <div className="v2-ml-primary">
            <span className="mi t-green"><BrainCircuit size={20} strokeWidth={2.1} /></span>
            <div>
              <span>Production model</span>
              <strong>{String(operational?.modelHealth?.modelName ?? "diagnostic_model")}</strong>
            </div>
          </div>

          <div className="v2-ml-grid">
            <div className="v2-ml-cell">
              <ShieldCheck size={15} strokeWidth={2.1} />
              <div><span>Version</span><strong>v{String(operational?.modelHealth?.version ?? "--")}</strong></div>
            </div>
            <div className="v2-ml-cell">
              <Timer size={15} strokeWidth={2.1} />
              <div><span>Training date</span><strong>{formatDate(String(operational?.modelHealth?.trainingDate ?? ""))}</strong></div>
            </div>
            <div className="v2-ml-cell">
              <Server size={15} strokeWidth={2.1} />
              <div><span>Registry status</span><strong>{String(operational?.modelHealth?.status ?? "development")}</strong></div>
            </div>
            <div className="v2-ml-cell">
              <Database size={15} strokeWidth={2.1} />
              <div><span>Artifact</span><strong>{operational?.modelHealth?.artifactPath ? "Registered" : "Not linked"}</strong></div>
            </div>
          </div>

          {modelMetrics.length ? (
            <div className="v2-ml-metrics">
              {modelMetrics.map((metric) => (
                <div key={metric.label}>
                  <span>{metric.label}</span>
                  <strong>{metric.value}</strong>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: ".84rem", color: "var(--muted)", marginTop: 12 }}>
              No validation metrics are recorded in the model registry.
            </p>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
