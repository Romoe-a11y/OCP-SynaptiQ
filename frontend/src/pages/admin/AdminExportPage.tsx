import {
  Activity,
  Clock3,
  Cpu,
  Download,
  FileSpreadsheet,
  Gauge,
  Thermometer,
  Zap,
} from "lucide-react";

import DashboardLayout from "../../components/layout/DashboardLayout";
import Loader from "../../components/common/Loader";
import ApiError from "../../components/common/ApiError";
import { useApi } from "../../hooks/useApi";
import { getRecentMesuresOnly } from "../../services/dashboardService";
import type { MesureApi } from "../../types";

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

function statusTone(status?: string) {
  if (status === "CRITIQUE") return "t-crit";
  if (status === "ALERTE") return "t-warn";
  return "t-ok";
}

function exportCsv(rows: MesureApi[]) {
  const header = [
    "id", "machine", "horodatage", "temperature", "courant",
    "vibration", "rpm", "statut", "etiquetteAnomalie",
  ];

  const content = rows.map((row) => [
    row.id, row.machine?.nom ?? "", row.horodatage ?? "",
    row.temperature ?? "", row.courant ?? "", row.vibration ?? "",
    row.rpm ?? "", row.statut ?? "", row.etiquetteAnomalie ?? "",
  ]);

  const csv =
    "﻿" +
    [header, ...content]
      .map((line) =>
        line.map((cell) => `"${String(cell).split('"').join('""')}"`).join(";")
      )
      .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "ocp-synaptiq-motor-measures.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function AdminExportPage() {
  const { data: items, loading, error, reload } = useApi(getRecentMesuresOnly, [], 5_000);
  const measures = items ?? [];

  if (loading) {
    return (
      <DashboardLayout title="Export CSV" subtitle="Loading..." roleLabel="Administrator">
        <Loader />
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="Export CSV" subtitle="Unable to load" roleLabel="Administrator">
        <ApiError message={error} onRetry={reload} />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Export CSV"
      subtitle="Export motor supervision measurements for reporting and analysis."
      roleLabel="Administrator"
    >
      <div className="v2-kpi-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        <div className="v2-kpi">
          <span className="ic t-ok"><FileSpreadsheet size={18} strokeWidth={2.2} /></span>
          <div className="label">Available records</div>
          <div className="value">{measures.length}</div>
        </div>
        <div className="v2-kpi">
          <span className="ic t-green"><Cpu size={18} strokeWidth={2.2} /></span>
          <div className="label">Machines</div>
          <div className="value">{new Set(measures.map((m) => m.machine?.nom).filter(Boolean)).size}</div>
        </div>
        <div className="v2-kpi">
          <span className="ic t-purple"><Clock3 size={18} strokeWidth={2.2} /></span>
          <div className="label">Latest</div>
          <div className="value" style={{ fontSize: "1rem" }}>{formatDate(measures[0]?.horodatage)}</div>
        </div>
      </div>

      <div className="v2-card v2-card-pad">
        <div className="v2-card-head" style={{ alignItems: "center" }}>
          <div>
            <div className="eyebrow">Data Export</div>
            <h3>CSV Export</h3>
          </div>
          <button
            type="button"
            className="v2-btn v2-btn-primary"
            onClick={() => exportCsv(measures)}
          >
            <Download size={17} />
            Download CSV
          </button>
        </div>
        <p style={{ fontSize: ".84rem", color: "var(--muted)", marginTop: 4 }}>
          Export the latest stored motor measurements in CSV format. The file is compatible with Excel.
        </p>
      </div>

      <div className="v2-card v2-card-pad">
        <div className="v2-card-head" style={{ alignItems: "center" }}>
          <h3>Data preview</h3>
          <span className="v2-badge neutral">{Math.min(measures.length, 8)} of {measures.length}</span>
        </div>

        <div className="v2-rows">
          {measures.length ? (
            measures.slice(0, 8).map((item) => (
              <div className="v2-row-item" key={item.id}>
                <span className={`ri ${statusTone(item.statut)}`}>
                  <Cpu size={19} strokeWidth={2.2} />
                </span>
                <div className="body">
                  <b>{item.machine?.nom ?? "Machine"}</b>
                  <div className="meta">
                    <span className={statusBadge(item.statut)}>{item.statut ?? "--"}</span>
                    <span className="chip"><Thermometer size={12} /> {item.temperature ?? "--"} °C</span>
                    <span className="chip"><Zap size={12} /> {item.courant ?? "--"} A</span>
                    <span className="chip"><Activity size={12} /> {item.vibration ?? "--"}</span>
                    <span className="chip"><Gauge size={12} /> {item.rpm ?? "--"} RPM</span>
                    <span className="chip"><Clock3 size={12} /> {formatDate(item.horodatage)}</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="v2-empty">No data available for export.</div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
