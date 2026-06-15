import { useMemo, useState } from "react";
import {
  Thermometer,
  Zap,
  Activity,
  Gauge,
  Search,
  Cpu,
} from "lucide-react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import Card from "../../components/common/Card";
import Loader from "../../components/common/Loader";
import { useApi } from "../../hooks/useApi";
import { getMesures } from "../../services/dashboardService";
import type { MesureApi } from "../../types";

type LatestMotorState = {
  machineId: string;
  machineName: string;
  horodatage?: string;
  temperature?: number;
  courant?: number;
  vibration?: number;
  rpm?: number;
  statut?: string;
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

function getStatusClass(status?: string) {
  if (status === "NORMAL") return "status-normal";
  if (status === "ALERTE") return "status-alert";
  if (status === "CRITIQUE") return "status-critical";
  return "";
}

function buildLatestStates(items: MesureApi[]): LatestMotorState[] {
  const latestByMachineName = new Map<string, LatestMotorState>();

  for (const item of items) {
    const machineName = item.machine?.nom?.trim() || "Unnamed motor";
    const machineKey = machineName.toLowerCase();
    const currentDate = item.horodatage ? new Date(item.horodatage).getTime() : 0;

    const existing = latestByMachineName.get(machineKey);
    const existingDate = existing?.horodatage
      ? new Date(existing.horodatage).getTime()
      : 0;

    if (!existing || currentDate > existingDate) {
      latestByMachineName.set(machineKey, {
        machineId:
          item.machine?.id != null ? String(item.machine.id) : machineKey,
        machineName,
        horodatage: item.horodatage,
        temperature: item.temperature,
        courant: item.courant,
        vibration: item.vibration,
        rpm: item.rpm,
        statut: item.statut,
      });
    }
  }

  return Array.from(latestByMachineName.values()).sort((a, b) =>
    a.machineName.localeCompare(b.machineName)
  );
}

export default function UserMotorsPage() {
  const { data: items, loading } = useApi(getMesures, [], 3_000);
  const [search, setSearch] = useState("");

  const latestStates = useMemo(() => buildLatestStates(items ?? []), [items]);

  const filteredMotors = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return latestStates;

    return latestStates.filter((motor) =>
      motor.machineName.toLowerCase().includes(query)
    );
  }, [latestStates, search]);

  return (
      <DashboardLayout
        title="Motors"
        subtitle="Search and consult the latest motor state."
        roleLabel="Operator"
      >
      {loading ? (
        <Loader />
      ) : (
        <div className="stack">
          <Card className="info-card">
            <div className="card-title-row">
              <h3>Motor search</h3>
            </div>

            <div className="motors-search-bar enhanced-search-bar">
              <div className="search-icon-wrap">
                <Search size={18} strokeWidth={2.2} />
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search a motor by name..."
                className="motors-search-input enhanced-search-input"
              />
            </div>

            <p className="motors-search-helper">
              {filteredMotors.length} motor{filteredMotors.length > 1 ? "s" : ""} found
            </p>
          </Card>

          <div className="motors-grid">
            {filteredMotors.length ? (
              filteredMotors.map((motor) => (
                <Card className="motor-state-card enhanced-motor-card" key={motor.machineId}>
                  <div className="motor-state-header">
                    <div className="motor-title-wrap">
                      <div className="motor-main-icon">
                        <Cpu size={20} strokeWidth={2.2} />
                      </div>

                      <div>
                        <h3 className="motor-state-title">{motor.machineName}</h3>
                        <p className="motor-state-date">
                          Last update: {formatDate(motor.horodatage)}
                        </p>
                      </div>
                    </div>

                    <span className={`data-badge ${getStatusClass(motor.statut)}`}>
                      {motor.statut ?? "--"}
                    </span>
                  </div>

                  <div className="motor-state-grid">
                    <div className="motor-state-item temperature-card">
                      <div className="metric-icon">
                        <Thermometer size={20} strokeWidth={2.2} />
                      </div>
                      <div className="metric-content">
                        <span>Temperature</span>
                        <strong>{motor.temperature ?? "--"} °C</strong>
                      </div>
                    </div>

                    <div className="motor-state-item current-card">
                      <div className="metric-icon">
                        <Zap size={20} strokeWidth={2.2} />
                      </div>
                      <div className="metric-content">
                        <span>Current</span>
                        <strong>{motor.courant ?? "--"} A</strong>
                      </div>
                    </div>

                    <div className="motor-state-item vibration-card">
                      <div className="metric-icon">
                        <Activity size={20} strokeWidth={2.2} />
                      </div>
                      <div className="metric-content">
                        <span>Vibration</span>
                        <strong>{motor.vibration ?? "--"}</strong>
                      </div>
                    </div>

                    <div className="motor-state-item rpm-card">
                      <div className="metric-icon">
                        <Gauge size={20} strokeWidth={2.2} />
                      </div>
                      <div className="metric-content">
                        <span>RPM</span>
                        <strong>{motor.rpm ?? "--"}</strong>
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <Card className="info-card">
                <div className="centered-empty">No motor found.</div>
              </Card>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
