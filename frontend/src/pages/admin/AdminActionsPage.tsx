import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Cpu,
  Download,
  FileText,
  Gauge,
  SlidersHorizontal,
  Thermometer,
  Wrench,
} from "lucide-react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import Loader from "../../components/common/Loader";
import { useApi } from "../../hooks/useApi";
import { getDashboardData } from "../../services/dashboardService";
import type { DashboardResponse } from "../../types";

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function csvValue(value: unknown) {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function downloadCsv(filename: string, data?: DashboardResponse | null) {
  const rows: unknown[][] = [["Section", "ID", "Asset", "Status", "Metric", "Value", "Timestamp", "Details"]];
  if (data?.derniereMesure) {
    const m = data.derniereMesure;
    rows.push(["Latest measure", m.id, m.nomMachine, m.statut, "Temperature", m.temperature, m.horodatage, "degC"]);
    rows.push(["Latest measure", m.id, m.nomMachine, m.statut, "Current", m.courant, m.horodatage, "A"]);
    rows.push(["Latest measure", m.id, m.nomMachine, m.statut, "Vibration", m.vibration, m.horodatage, ""]);
    rows.push(["Latest measure", m.id, m.nomMachine, m.statut, "RPM", m.rpm, m.horodatage, ""]);
  }
  data?.alertes?.forEach((item) => rows.push(["Alert", item.id, "", item.statut, item.gravite, "", item.dateCreation, item.message]));
  data?.anomalies?.forEach((item) => rows.push(["Anomaly", item.id, "", "", item.type, item.score, item.dateDetection, item.description]));
  data?.predictions?.forEach((item) => rows.push(["Prediction", item.id, "", item.statutPredit, item.niveauRisque, item.confiance, item.dateCreation, "confidence"]));
  const csv = rows.map((row) => row.map(csvValue).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function AdminActionsPage() {
  const navigate = useNavigate();
  const { data, loading } = useApi(getDashboardData, [], 3_000);

  const snap = useMemo(() => ({
    machine: data?.derniereMesure?.nomMachine ?? "--",
    temperature: data?.derniereMesure?.temperature ?? "--",
    rpm: data?.derniereMesure?.rpm ?? "--",
    status: data?.derniereMesure?.statut ?? "--",
  }), [data]);

  if (loading) {
    return (
      <DashboardLayout title="Actions" subtitle="Loading..." roleLabel="Administrator">
        <Loader />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Actions"
      subtitle="Operational actions and export tools linked to the current dashboard data."
      roleLabel="Administrator"
    >
      <div className="v2-kpi-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        <div className="v2-kpi">
          <span className="ic t-green"><Cpu size={18} strokeWidth={2.2} /></span>
          <div className="label">Machine</div>
          <div className="value" style={{ fontSize: "1.1rem" }}>{snap.machine}</div>
        </div>
        <div className="v2-kpi">
          <span className="ic t-ok"><Wrench size={18} strokeWidth={2.2} /></span>
          <div className="label">Status</div>
          <div className="value" style={{ fontSize: "1.1rem" }}>{snap.status}</div>
        </div>
        <div className="v2-kpi">
          <span className="ic t-temp"><Thermometer size={18} strokeWidth={2.2} /></span>
          <div className="label">Temperature</div>
          <div className="value">{snap.temperature}<small> °C</small></div>
        </div>
        <div className="v2-kpi">
          <span className="ic t-vib"><Gauge size={18} strokeWidth={2.2} /></span>
          <div className="label">RPM</div>
          <div className="value">{snap.rpm}</div>
        </div>
      </div>

      <div className="v2-card v2-card-pad">
        <div className="v2-card-head">
          <h3>Action center</h3>
        </div>
        <div className="v2-opt-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
          <div className="v2-opt-card" onClick={() => navigate("/admin/thresholds")} style={{ cursor: "pointer" }}>
            <div className="oi t-vib"><SlidersHorizontal size={20} /></div>
            <b>Thresholds</b>
            <p>Open the dedicated threshold configuration page.</p>
          </div>
          <div className="v2-opt-card" onClick={() => downloadCsv("ocp-synaptiq-dashboard-admin.csv", data)} style={{ cursor: "pointer" }}>
            <div className="oi t-ok"><Download size={20} /></div>
            <b>CSV export</b>
            <p>Download the current dashboard snapshot and latest events.</p>
          </div>
          <div className="v2-opt-card" onClick={() => navigate("/admin/report")} style={{ cursor: "pointer" }}>
            <div className="oi t-purple"><FileText size={20} /></div>
            <b>PDF report</b>
            <p>Open the professional report page prepared for PDF export.</p>
          </div>
          <div className="v2-opt-card" onClick={() => downloadJson("ocp-synaptiq-dashboard-admin.json", data)} style={{ cursor: "pointer" }}>
            <div className="oi t-cur"><Download size={20} /></div>
            <b>JSON export</b>
            <p>Export the complete dashboard API payload for technical review.</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
