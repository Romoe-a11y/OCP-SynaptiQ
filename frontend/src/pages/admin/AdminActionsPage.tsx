import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../../components/layout/DashboardLayout";
import Card from "../../components/common/Card";
import Loader from "../../components/common/Loader";
import Button from "../../components/common/Button";
import { useApi } from "../../hooks/useApi";
import { getDashboardData } from "../../services/dashboardService";
import type { DashboardResponse } from "../../types";

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json;charset=utf-8;",
  });
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
  const rows: unknown[][] = [
    ["Section", "ID", "Asset", "Status", "Metric", "Value", "Timestamp", "Details"],
  ];

  if (data?.derniereMesure) {
    const m = data.derniereMesure;
    rows.push(["Latest measure", m.id, m.nomMachine, m.statut, "Temperature", m.temperature, m.horodatage, "degC"]);
    rows.push(["Latest measure", m.id, m.nomMachine, m.statut, "Current", m.courant, m.horodatage, "A"]);
    rows.push(["Latest measure", m.id, m.nomMachine, m.statut, "Vibration", m.vibration, m.horodatage, ""]);
    rows.push(["Latest measure", m.id, m.nomMachine, m.statut, "RPM", m.rpm, m.horodatage, ""]);
  }

  data?.alertes?.forEach((item) => {
    rows.push(["Alert", item.id, "", item.statut, item.gravite, "", item.dateCreation, item.message]);
  });

  data?.anomalies?.forEach((item) => {
    rows.push(["Anomaly", item.id, "", "", item.type, item.score, item.dateDetection, item.description]);
  });

  data?.predictions?.forEach((item) => {
    rows.push(["Prediction", item.id, "", item.statutPredit, item.niveauRisque, item.confiance, item.dateCreation, "confidence"]);
  });

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

  const liveSnapshot = useMemo(() => {
    return {
      machine: data?.derniereMesure?.nomMachine ?? "--",
      temperature: data?.derniereMesure?.temperature ?? "--",
      rpm: data?.derniereMesure?.rpm ?? "--",
      status: data?.derniereMesure?.statut ?? "--",
    };
  }, [data]);

  return (
    <DashboardLayout
      title="Admin Actions"
      subtitle="Operational actions and export tools linked to the current dashboard data."
      roleLabel="Administrator"
    >
      {loading ? (
        <Loader />
      ) : (
        <div className="stack">
          <section className="metrics-grid">
            <Card className="info-card">
              <small>Machine</small>
              <h3>{liveSnapshot.machine}</h3>
              <p style={{ color: "var(--muted)" }}>Current monitored asset</p>
            </Card>

            <Card className="info-card">
              <small>Status</small>
              <h3>{liveSnapshot.status}</h3>
              <p style={{ color: "var(--muted)" }}>Latest operational state</p>
            </Card>

            <Card className="info-card">
              <small>Temperature</small>
              <h3>{liveSnapshot.temperature} °C</h3>
              <p style={{ color: "var(--muted)" }}>Latest thermal value</p>
            </Card>

            <Card className="info-card">
              <small>RPM</small>
              <h3>{liveSnapshot.rpm}</h3>
              <p style={{ color: "var(--muted)" }}>Latest rotational speed</p>
            </Card>
          </section>

          <Card className="info-card actions-center-card">
            <div className="card-title-row">
              <h3>Action center</h3>
            </div>

            <div className="quick-actions actions-card-grid">
              <div className="quick-action-card">
                <h4>Thresholds</h4>
                <p>Open the dedicated threshold configuration page.</p>
              </div>
              <div className="quick-action-card">
                <h4>CSV export</h4>
                <p>Download the current dashboard snapshot and latest events.</p>
              </div>
              <div className="quick-action-card">
                <h4>PDF report</h4>
                <p>Open the professional report page prepared for PDF export.</p>
              </div>
              <div className="quick-action-card">
                <h4>JSON export</h4>
                <p>Export the complete dashboard API payload for technical review.</p>
              </div>
            </div>

            <div className="footer-actions actions-button-row">
              <Button variant="secondary" onClick={() => navigate("/admin/thresholds")}>
                Open thresholds
              </Button>

              <Button
                variant="secondary"
                onClick={() => downloadCsv("ocp-synaptiq-dashboard-admin.csv", data)}
              >
                Download CSV
              </Button>

              <Button variant="secondary" onClick={() => navigate("/admin/report")}>
                Download Report
              </Button>

              <Button
                variant="secondary"
                onClick={() => downloadJson("ocp-synaptiq-dashboard-admin.json", data)}
              >
                Export dashboard JSON
              </Button>
            </div>
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
}
