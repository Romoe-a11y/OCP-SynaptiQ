import { useMemo } from "react";
import {
  Thermometer,
  Zap,
  Activity,
  Gauge,
  Clock3,
  Cpu,
} from "lucide-react";

import DashboardLayout from "../../components/layout/DashboardLayout";
import Card from "../../components/common/Card";
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

function getStatusClass(status?: string) {
  if (status === "CRITIQUE") return "badge-critical";
  if (status === "ALERTE") return "badge-alert";
  return "badge-normal";
}

export default function UserHistoryPage() {
  const { data: items, loading, error, reload } = useApi(getRecentMesuresOnly, [], 5_000);
  const measures = items ?? [];
  const latest = useMemo(() => measures[0], [measures]);

  return (
    <DashboardLayout
      title="User History"
      subtitle="Recent motor measurements and stored supervision data."
      roleLabel="Operator"
    >
      {loading ? (
        <Loader />
      ) : error ? (
        <ApiError message={error} onRetry={reload} />
      ) : (
        <div className="stack">
          <Card className="info-card">
            <div className="card-title-row">
              <h3>Latest stored measure</h3>
              {latest?.statut && (
                <span className={`data-badge ${getStatusClass(latest.statut)}`}>
                  {latest.statut}
                </span>
              )}
            </div>

            {latest ? (
              <>
                <div className="history-machine-header">
                  <div className="history-machine-main">
                    <div className="history-machine-icon">
                      <Cpu size={18} />
                    </div>
                    <div>
                      <div className="history-machine-label">Machine</div>
                      <h4 className="history-machine-name">
                        {latest.machine?.nom ?? "--"}
                      </h4>
                    </div>
                  </div>

                  <div className="history-machine-time">
                    <Clock3 size={16} />
                    <span>{formatDate(latest.horodatage)}</span>
                  </div>
                </div>

                <div className="history-summary-grid">
                  <div className="history-summary-card">
                    <div className="history-summary-icon thermal">
                      <Thermometer size={18} />
                    </div>
                    <div className="history-summary-content">
                      <span>Temperature</span>
                      <strong>{latest.temperature ?? "--"} °C</strong>
                    </div>
                  </div>

                  <div className="history-summary-card">
                    <div className="history-summary-icon current">
                      <Zap size={18} />
                    </div>
                    <div className="history-summary-content">
                      <span>Current</span>
                      <strong>{latest.courant ?? "--"} A</strong>
                    </div>
                  </div>

                  <div className="history-summary-card">
                    <div className="history-summary-icon vibration">
                      <Activity size={18} />
                    </div>
                    <div className="history-summary-content">
                      <span>Vibration</span>
                      <strong>{latest.vibration ?? "--"}</strong>
                    </div>
                  </div>

                  <div className="history-summary-card">
                    <div className="history-summary-icon rpm">
                      <Gauge size={18} />
                    </div>
                    <div className="history-summary-content">
                      <span>RPM</span>
                      <strong>{latest.rpm ?? "--"}</strong>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="centered-empty">No stored measures available.</div>
            )}
          </Card>

          <Card className="info-card">
            <div className="card-title-row">
              <h3>Recent measurements</h3>
            </div>

            <div className="list-stack">
              {measures.length ? (
                measures.map((item) => (
                  <div className="history-measure-card" key={item.id}>
                    <div className="history-measure-top">
                      <div>
                        <h4 className="history-measure-title">
                          {item.machine?.nom ?? "Machine"}
                        </h4>
                        <p className="history-measure-date">
                          {formatDate(item.horodatage)}
                        </p>
                      </div>

                      <span className={`data-badge ${getStatusClass(item.statut)}`}>
                        {item.statut ?? "--"}
                      </span>
                    </div>

                    <div className="history-measure-stats">
                      <div className="history-stat-pill">
                        <Thermometer size={16} />
                        <span>{item.temperature ?? "--"} °C</span>
                      </div>

                      <div className="history-stat-pill">
                        <Zap size={16} />
                        <span>{item.courant ?? "--"} A</span>
                      </div>

                      <div className="history-stat-pill">
                        <Activity size={16} />
                        <span>{item.vibration ?? "--"}</span>
                      </div>

                      <div className="history-stat-pill">
                        <Gauge size={16} />
                        <span>{item.rpm ?? "--"} RPM</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="centered-empty">No history available.</div>
              )}
            </div>
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
}
