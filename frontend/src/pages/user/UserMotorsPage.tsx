import { useMemo, useState } from "react";
import {
  Activity,
  Cpu,
  Gauge,
  Search,
  Thermometer,
  Zap,
} from "lucide-react";
import DashboardLayout from "../../components/layout/DashboardLayout";
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
    : date.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

function statusBadge(status?: string) {
  if (status === "CRITIQUE") return "v2-badge crit";
  if (status === "ALERTE") return "v2-badge warn";
  return "v2-badge ok";
}

function buildLatestStates(items: MesureApi[]): LatestMotorState[] {
  const latestByMachineName = new Map<string, LatestMotorState>();

  for (const item of items) {
    const machineName = item.machine?.nom?.trim() || "Unnamed motor";
    const machineKey = machineName.toLowerCase();
    const currentDate = item.horodatage ? new Date(item.horodatage).getTime() : 0;
    const existing = latestByMachineName.get(machineKey);
    const existingDate = existing?.horodatage ? new Date(existing.horodatage).getTime() : 0;

    if (!existing || currentDate > existingDate) {
      latestByMachineName.set(machineKey, {
        machineId: item.machine?.id != null ? String(item.machine.id) : machineKey,
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
    return latestStates.filter((motor) => motor.machineName.toLowerCase().includes(query));
  }, [latestStates, search]);

  if (loading) {
    return (
      <DashboardLayout title="Motors" subtitle="Loading..." roleLabel="Operator">
        <Loader />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Motors"
      subtitle="Search and consult the latest motor state."
      roleLabel="Operator"
    >
      <div className="v2-card v2-card-pad">
        <div className="v2-card-head"><h3>Motor search</h3></div>
        <div style={{ position: "relative", marginTop: 8 }}>
          <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
          <input
            type="text"
            className="v2-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search a motor by name..."
            style={{ paddingLeft: 36 }}
          />
        </div>
        <p style={{ fontSize: ".82rem", color: "var(--muted)", marginTop: 8 }}>
          {filteredMotors.length} motor{filteredMotors.length !== 1 ? "s" : ""} found
        </p>
      </div>

      <div className="user-motors-grid">
        {filteredMotors.length ? (
          filteredMotors.map((motor) => (
            <div className="v2-card v2-card-pad user-motor-card" key={motor.machineId}>
              <div className="user-motor-head">
                <div className="user-motor-title-row">
                  <span className="ic t-green"><Cpu size={20} strokeWidth={2.2} /></span>
                  <div className="user-motor-title-copy">
                    <strong>{motor.machineName}</strong>
                    <div>Last update: {formatDate(motor.horodatage)}</div>
                  </div>
                </div>
                <span className={statusBadge(motor.statut)}>{motor.statut ?? "--"}</span>
              </div>

              <div className="v2-signals">
                <div className="v2-signal">
                  <div className="st"><span className="si t-temp"><Thermometer size={16} strokeWidth={2.2} /></span><span className="sl">Temp</span></div>
                  <div className="sv">{motor.temperature ?? "--"}<small>&deg;C</small></div>
                </div>
                <div className="v2-signal">
                  <div className="st"><span className="si t-cur"><Zap size={16} strokeWidth={2.2} /></span><span className="sl">Current</span></div>
                  <div className="sv">{motor.courant ?? "--"}<small>A</small></div>
                </div>
                <div className="v2-signal">
                  <div className="st"><span className="si t-vib"><Activity size={16} strokeWidth={2.2} /></span><span className="sl">Vibration</span></div>
                  <div className="sv">{motor.vibration ?? "--"}</div>
                </div>
                <div className="v2-signal">
                  <div className="st"><span className="si t-ok"><Gauge size={16} strokeWidth={2.2} /></span><span className="sl">RPM</span></div>
                  <div className="sv">{motor.rpm ?? "--"}</div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="v2-card v2-card-pad">
            <div className="v2-empty">No motor found.</div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
