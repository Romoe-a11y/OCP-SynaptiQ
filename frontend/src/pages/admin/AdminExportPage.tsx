import {
  FileSpreadsheet,
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
import Button from "../../components/common/Button";
import { useApi } from "../../hooks/useApi";
import { getRecentMesuresOnly } from "../../services/dashboardService";
import type { MesureApi } from "../../types";

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
  if (status === "CRITIQUE") return "badge-critical";
  if (status === "ALERTE") return "badge-alert";
  return "badge-normal";
}

function exportCsv(rows: MesureApi[]) {
  const header = [
    "id",
    "machine",
    "horodatage",
    "temperature",
    "courant",
    "vibration",
    "rpm",
    "statut",
    "etiquetteAnomalie",
  ];

  const content = rows.map((row) => [
    row.id,
    row.machine?.nom ?? "",
    row.horodatage ?? "",
    row.temperature ?? "",
    row.courant ?? "",
    row.vibration ?? "",
    row.rpm ?? "",
    row.statut ?? "",
    row.etiquetteAnomalie ?? "",
  ]);

  const csv =
    "﻿" +
    [header, ...content]
      .map((line) =>
        line
          .map((cell) => `"${String(cell).split('"').join('""')}"`)
          .join(";")
      )
      .join("\n");

  const blob = new Blob([csv], {
    type: "text/csv;charset=utf-8;",
  });

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

  return (
    <DashboardLayout
      title="Export CSV"
      subtitle="Export motor supervision measurements for reporting and analysis."
      roleLabel="Administrator"
    >
      {loading ? (
        <Loader />
      ) : error ? (
        <ApiError message={error} onRetry={reload} />
      ) : (
        <div className="stack">
          <Card className="info-card history-tools-card">
            <div className="card-title-row">
              <h3>CSV Export</h3>
            </div>

            <p className="history-tools-text">
              Export the latest stored motor measurements in CSV format. The file
              is compatible with Excel.
            </p>

            <div className="history-actions">
              <Button variant="secondary" onClick={() => exportCsv(measures)}>
                <span className="button-icon-content">
                  <FileSpreadsheet size={18} />
                  <span>Download CSV</span>
                </span>
              </Button>
            </div>
          </Card>

          <Card className="info-card">
            <div className="card-title-row">
              <h3>Data preview</h3>
            </div>

            <div className="list-stack">
              {measures.length ? (
                measures.slice(0, 8).map((item) => (
                  <div className="history-measure-card" key={item.id}>
                    <div className="history-measure-top">
                      <div>
                        <h4 className="history-measure-title">
                          {item.machine?.nom ?? "Machine"}
                        </h4>
                        <p className="history-measure-date">
                          <Clock3 size={14} /> {formatDate(item.horodatage)}
                        </p>
                      </div>

                      <span className={`data-badge ${getStatusClass(item.statut)}`}>
                        {item.statut ?? "--"}
                      </span>
                    </div>

                    <div className="history-measure-stats">
                      <div className="history-stat-pill">
                        <Cpu size={16} />
                        <span>ID #{item.id}</span>
                      </div>

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
                <div className="centered-empty">No data available for export.</div>
              )}
            </div>
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
}
