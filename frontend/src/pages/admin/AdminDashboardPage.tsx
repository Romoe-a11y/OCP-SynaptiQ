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
import Card from "../../components/common/Card";
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
  temperature: "#a33a3f",
  current: "#946513",
  vibration: "#315f9e",
  rpm: "#237246",
  alert: "#256f4c",
};

type KpiProps = {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  toneClass: string;
};

type SignalTileProps = {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  toneClass: string;
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

function statusClass(status?: string) {
  if (status === "CRITIQUE") return "badge-critical";
  if (status === "ALERTE") return "badge-alert";
  return "badge-normal";
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

function DashboardKpi({ label, value, icon, toneClass }: KpiProps) {
  return (
    <Card className="info-card kpi-card">
      <div className="kpi-header">
        <div>
          <span className="kpi-label">{label}</span>
          <strong className="kpi-value">{value}</strong>
        </div>
        <div className={`kpi-icon ${toneClass}`}>{icon}</div>
      </div>
    </Card>
  );
}

function SignalTile({ label, value, icon, toneClass }: SignalTileProps) {
  return (
    <div className="signal-tile">
      <div className={`signal-icon ${toneClass}`}>{icon}</div>
      <div className="signal-copy">
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
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
    3_000, // Auto-refresh every 3 seconds
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
    const counts = {
      Critical: 0,
      Warning: 0,
      Normal: 0,
      Other: 0,
    };

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

  const kpis = [
    {
      label: "Measures",
      value: stats?.totalMesures ?? "--",
      icon: <BarChart3 size={18} strokeWidth={2.2} />,
      toneClass: "vibration-tone",
    },
    {
      label: "Active alerts",
      value: stats?.totalAlertesActives ?? "--",
      icon: <BellRing size={18} strokeWidth={2.2} />,
      toneClass: "critical-tone",
    },
    {
      label: "Anomalies",
      value: stats?.totalAnomalies ?? "--",
      icon: <TriangleAlert size={18} strokeWidth={2.2} />,
      toneClass: "warning-tone",
    },
    {
      label: "Avg temperature",
      value: avgTemp ? `${avgTemp} °C` : "--",
      icon: <Thermometer size={18} strokeWidth={2.2} />,
      toneClass: "temperature-tone",
    },
    {
      label: "Drift health",
      value: driftStatus,
      icon: <ShieldCheck size={18} strokeWidth={2.2} />,
      toneClass: driftStatus === "DRIFT" ? "critical-tone" : "vibration-tone",
    },
    {
      label: "Model health",
      value: modelStatus,
      icon: <BrainCircuit size={18} strokeWidth={2.2} />,
      toneClass: "normal-tone",
    },
  ];

  if (loading) {
    return (
      <DashboardLayout
        title="Dashboard"
        subtitle="Loading data..."
        roleLabel="Administrator"
      >
        <Loader />
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout
        title="Dashboard"
        subtitle="Unable to load data"
        roleLabel="Administrator"
      >
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
      <div className="admin-kpi-grid">
        {kpis.map((kpi) => (
          <DashboardKpi key={kpi.label} {...kpi} />
        ))}
      </div>

      <div className="admin-dashboard-grid dashboard-flow">
        <div className="stack">
          <Card className="info-card">
            <div className="asset-header">
              <div className="asset-title-wrap">
                <div className="asset-icon">
                  <Cpu size={22} strokeWidth={2.2} />
                </div>
                <div>
                  <div className="asset-meta-label">Monitored asset</div>
                  <h3 className="asset-name">{latestMeasure?.nomMachine ?? "--"}</h3>
                  <p className="asset-updated">
                    Updated {formatDate(latestMeasure?.horodatage)}
                  </p>
                </div>
              </div>

              <span className={`data-badge ${statusClass(status)}`}>{status}</span>
            </div>

            <div className="signal-grid">
              <SignalTile
                label="Temperature"
                value={`${latestMeasure?.temperature ?? "--"} °C`}
                icon={<Thermometer size={19} strokeWidth={2.2} />}
                toneClass="temperature-tone"
              />
              <SignalTile
                label="Current"
                value={`${latestMeasure?.courant ?? "--"} A`}
                icon={<Zap size={19} strokeWidth={2.2} />}
                toneClass="current-tone"
              />
              <SignalTile
                label="Vibration"
                value={latestMeasure?.vibration ?? "--"}
                icon={<Activity size={19} strokeWidth={2.2} />}
                toneClass="vibration-tone"
              />
              <SignalTile
                label="RPM"
                value={latestMeasure?.rpm ?? "--"}
                icon={<Gauge size={19} strokeWidth={2.2} />}
                toneClass="rpm-tone"
              />
            </div>

            <div className="card-footer-meta">
              {recentMeasures.length} recent samples loaded
            </div>
          </Card>

          <Card className="info-card">
            <div className="chart-card-header">
              <div>
                <span className="card-eyebrow">Trend</span>
                <h3>Temperature evolution</h3>
              </div>
              <div className="chart-icon temperature-tone">
                <Thermometer size={18} strokeWidth={2.2} />
              </div>
            </div>

            <div className="chart-shell">
              <ResponsiveContainer>
                <LineChart data={temperatureTrendData}>
                  <CartesianGrid stroke="rgba(23, 33, 27, 0.08)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#64706a" }} />
                  <YAxis tick={{ fontSize: 12, fill: "#64706a" }} />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="temperature"
                    name="Temperature"
                    stroke={chartColors.temperature}
                    strokeWidth={3}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        <div className="stack">
          <Card className="info-card">
            <div className="chart-card-header">
              <div>
                <span className="card-eyebrow">Distribution</span>
                <h3>Alerts by severity</h3>
              </div>
              <div className="chart-icon critical-tone">
                <BellRing size={18} strokeWidth={2.2} />
              </div>
            </div>

            <div className="chart-shell">
              <ResponsiveContainer>
                <BarChart data={alertSeverityData}>
                  <CartesianGrid stroke="rgba(23, 33, 27, 0.08)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#64706a" }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#64706a" }} />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Bar
                    dataKey="value"
                    name="Alerts"
                    fill={chartColors.alert}
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="info-card">
            <div className="card-title-row">
              <h3>Recent alerts</h3>
              <button
                type="button"
                className="card-action-link card-link-button"
                onClick={() => navigate("/admin/alerts")}
              >
                View all
              </button>
            </div>

            <div className="list-stack">
              {recentAlerts.length ? (
                recentAlerts.map((alert) => (
                  <AlertCard key={alert.id} alert={alert} />
                ))
              ) : (
                <div className="centered-empty">No alerts currently available.</div>
              )}
            </div>
          </Card>
        </div>
      </div>

      <div className="admin-bottom-grid">
        <Card className="info-card">
          <div className="card-title-row">
            <h3>RUL trend</h3>
            <span className="data-badge">
              {operational?.rulTrend?.[0]?.simulated ? "Simulated" : "Model"}
            </span>
          </div>
          {hasRulTrend ? (
            <>
              <div className="ops-card-summary">
                <div>
                  <span>Latest remaining life</span>
                  <strong>{formatDays(latestRulDays)}</strong>
                </div>
                <div>
                  <span>Confidence</span>
                  <strong>{formatPercent(latestRulConfidence)}</strong>
                </div>
              </div>
              <div className="chart-shell chart-shell-sm">
                <ResponsiveContainer>
                  <LineChart data={rulTrendData}>
                    <CartesianGrid stroke="rgba(23, 33, 27, 0.08)" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#64706a" }} />
                    <YAxis tick={{ fontSize: 12, fill: "#64706a" }} />
                    <Tooltip content={<CustomChartTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="rulDays"
                      name="RUL days"
                      stroke={chartColors.vibration}
                      strokeWidth={3}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : (
            <div className="ops-empty-state">
              <Timer size={22} strokeWidth={2.1} />
              <div>
                <strong>RUL history not ready</strong>
                <p>
                  Remaining-life trend needs at least two valid model outputs. Keep ingestion and RUL prediction running to build this curve.
                </p>
              </div>
            </div>
          )}
        </Card>

        <Card className="info-card">
          <div className="card-title-row">
            <h3>Anomaly score trend</h3>
            <span
              className={
                driftStatus === "DRIFT"
                  ? "data-badge badge-critical"
                  : "data-badge badge-normal"
              }
            >
              Drift {driftStatus}
            </span>
          </div>
          <div className="chart-shell chart-shell-sm">
            <ResponsiveContainer>
              <LineChart data={anomalyTrendData}>
                <CartesianGrid stroke="rgba(23, 33, 27, 0.08)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#64706a" }} />
                <YAxis tick={{ fontSize: 12, fill: "#64706a" }} />
                <Tooltip content={<CustomChartTooltip />} />
                <Line
                  type="monotone"
                  dataKey="anomalyScore"
                  name="Anomaly score"
                  stroke={chartColors.temperature}
                  strokeWidth={3}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="info-card">
          <div className="card-title-row">
            <h3>Feature trends</h3>
          </div>
          <div className="chart-shell">
            <ResponsiveContainer>
              <LineChart data={featureTrendData}>
                <CartesianGrid stroke="rgba(23, 33, 27, 0.08)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#64706a" }} />
                <YAxis tick={{ fontSize: 12, fill: "#64706a" }} />
                <Tooltip content={<CustomChartTooltip />} />
                <Line
                  type="monotone"
                  dataKey="temperature"
                  name="Temperature"
                  stroke={chartColors.temperature}
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="courant"
                  name="Current"
                  stroke={chartColors.current}
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="vibration"
                  name="Vibration"
                  stroke={chartColors.vibration}
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="rpm"
                  name="RPM"
                  stroke={chartColors.rpm}
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="info-card">
          <div className="card-title-row">
            <h3>Prediction explanation</h3>
            <div className={`data-badge ${predictionUsesFallback ? "badge-alert" : "badge-normal"}`}>
              <Timer size={14} />
              {predictionUsesFallback ? "Fallback" : latestExplanation?.timestamp
                ? formatDate(String(latestExplanation.timestamp))
                : "No data"}
            </div>
          </div>
          {latestExplanation ? (
            <div className="ops-explanation-card">
              <div className="ops-explanation-main">
                <span>Predicted condition</span>
                <strong>{String(latestExplanation.label ?? "Latest prediction")}</strong>
                <p>{String(latestExplanation.decision ?? "No decision recorded")}</p>
              </div>
              <div className={predictionUsesFallback ? "ops-service-note warning" : "ops-service-note"}>
                <Info size={17} strokeWidth={2.1} />
                <p>{predictionExplanation}</p>
              </div>
            </div>
          ) : (
            <div className="centered-empty">No prediction explanation available.</div>
          )}
        </Card>

        <Card className="info-card">
          <div className="card-title-row">
            <h3>Active machine status</h3>
          </div>
          <div className="list-stack">
            {(operational?.activeMachineStatus ?? []).length ? (
              (operational?.activeMachineStatus ?? []).slice(0, 6).map((machine) => (
                <div className="history-measure-card" key={String(machine.id)}>
                  <div className="history-measure-top">
                    <div>
                      <h4 className="history-measure-title">
                        {String(machine.name ?? "--")}
                      </h4>
                      <p className="history-measure-date">
                        {String(machine.location ?? "--")}
                      </p>
                    </div>
                    <span
                      className={`data-badge ${statusClass(String(machine.status ?? ""))}`}
                    >
                      {String(machine.status ?? "--")}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="centered-empty">No active machine status available.</div>
            )}
          </div>
        </Card>

        <Card className="info-card">
          <div className="card-title-row">
            <h3>Model health</h3>
            <span className="data-badge">
              {String(operational?.modelHealth?.status ?? "development")}
            </span>
          </div>
          <div className="ops-model-health">
            <div className="ops-model-primary">
              <BrainCircuit size={22} strokeWidth={2.1} />
              <div>
                <span>Production model</span>
                <strong>{String(operational?.modelHealth?.modelName ?? "diagnostic_model")}</strong>
              </div>
            </div>

            <div className="ops-model-grid">
              <div>
                <ShieldCheck size={16} strokeWidth={2.1} />
                <span>Version</span>
                <strong>v{String(operational?.modelHealth?.version ?? "--")}</strong>
              </div>
              <div>
                <Timer size={16} strokeWidth={2.1} />
                <span>Training date</span>
                <strong>{formatDate(String(operational?.modelHealth?.trainingDate ?? ""))}</strong>
              </div>
              <div>
                <Server size={16} strokeWidth={2.1} />
                <span>Registry status</span>
                <strong>{String(operational?.modelHealth?.status ?? "development")}</strong>
              </div>
              <div>
                <Database size={16} strokeWidth={2.1} />
                <span>Artifact</span>
                <strong>{operational?.modelHealth?.artifactPath ? "Registered" : "Not linked"}</strong>
              </div>
            </div>

            {modelMetrics.length ? (
              <div className="ops-model-metrics">
                {modelMetrics.map((metric) => (
                  <div key={metric.label}>
                    <span>{metric.label}</span>
                    <strong>{metric.value}</strong>
                  </div>
                ))}
              </div>
            ) : (
              <p className="ops-model-note">No validation metrics are recorded in the model registry.</p>
            )}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
