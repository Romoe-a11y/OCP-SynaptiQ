import { useEffect, useMemo, useState } from "react";
import {
  Brain,
  Cpu,
  PlayCircle,
  ShieldCheck,
  Thermometer,
  TriangleAlert,
  Wrench,
  Zap,
} from "lucide-react";

import DashboardLayout from "../../components/layout/DashboardLayout";
import Loader from "../../components/common/Loader";
import AiDiagnosticCard from "../../components/cards/AiDiagnosticCard";
import { useToast } from "../../contexts/ToastContext";
import { useApi } from "../../hooks/useApi";
import {
  getMachines,
  postAiDiagnostic,
} from "../../services/dashboardService";
import api from "../../services/api";
import type { AiDiagnosticResponse } from "../../types";

type DiagnosticPayload = {
  temperature: number;
  courant: number;
  vibration: number;
  couple: number;
  rpm: number;
  failure_probability: number;
  component_health_score: number;
};

type Scenario = {
  key: string;
  label: string;
  tag: string;
  tone: string;
  payload?: DiagnosticPayload;
};

const scenarios: Scenario[] = [
  { key: "live", label: "Live measurement", tag: "LIVE", tone: "t-ok" },
  {
    key: "normal", label: "Normal operation", tag: "NOMINAL", tone: "t-ok",
    payload: { temperature: 45, courant: 12, vibration: 0.25, couple: 168.5, rpm: 1490, failure_probability: 0.08, component_health_score: 0.92 },
  },
  {
    key: "overheating", label: "Thermal overload", tag: "THERMAL", tone: "t-temp",
    payload: { temperature: 95, courant: 28, vibration: 1.2, couple: 180, rpm: 1450, failure_probability: 0.82, component_health_score: 0.35 },
  },
  {
    key: "mechanical", label: "Mechanical wear", tag: "MECHANICAL", tone: "t-vib",
    payload: { temperature: 68, courant: 20, vibration: 2.1, couple: 165, rpm: 1380, failure_probability: 0.74, component_health_score: 0.40 },
  },
  {
    key: "electrical", label: "Electrical overload", tag: "ELECTRICAL", tone: "t-cur",
    payload: { temperature: 78, courant: 48, vibration: 0.65, couple: 176, rpm: 1460, failure_probability: 0.79, component_health_score: 0.42 },
  },
  {
    key: "blockage", label: "Friction / blockage", tag: "BLOCKAGE", tone: "t-crit",
    payload: { temperature: 82, courant: 38, vibration: 1.8, couple: 195, rpm: 620, failure_probability: 0.88, component_health_score: 0.28 },
  },
];

function getScenarioIcon(key: string) {
  if (key === "normal") return <ShieldCheck size={16} strokeWidth={2.2} />;
  if (key === "overheating") return <Thermometer size={16} strokeWidth={2.2} />;
  if (key === "mechanical") return <Wrench size={16} strokeWidth={2.2} />;
  if (key === "electrical") return <Zap size={16} strokeWidth={2.2} />;
  if (key === "blockage") return <TriangleAlert size={16} strokeWidth={2.2} />;
  return <Brain size={16} strokeWidth={2.2} />;
}

export default function UserAiDiagnosisPage() {
  const toast = useToast();
  const { data: machines, loading: machinesLoading } = useApi(getMachines, [], 30_000);

  const [selectedMachineId, setSelectedMachineId] = useState<string>("");
  const [selectedScenarioKey, setSelectedScenarioKey] = useState("live");
  const [loading, setLoading] = useState(false);
  const [diagnostic, setDiagnostic] = useState<AiDiagnosticResponse | null>(null);
  const [sourceLabel, setSourceLabel] = useState("");
  const [activeScenarioLabel, setActiveScenarioLabel] = useState("Live measurement");

  useEffect(() => {
    if (machines?.length && !selectedMachineId) {
      setSelectedMachineId(String(machines[0].id));
    }
  }, [machines, selectedMachineId]);

  const selectedMachineLabel = useMemo(
    () => machines?.find((m: any) => String(m.id) === selectedMachineId)?.nom ?? "Unknown",
    [machines, selectedMachineId],
  );

  const selectedScenario = useMemo(
    () => scenarios.find((s) => s.key === selectedScenarioKey) ?? scenarios[0],
    [selectedScenarioKey],
  );

  async function runDiagnosis() {
    setLoading(true);
    try {
      let payload: DiagnosticPayload;
      let source: string;
      let scenarioLabel: string;

      if (selectedScenarioKey === "live") {
        try {
          const resp = await api.get(`/api/mesures/derniere`, { params: { machineId: selectedMachineId } });
          const m = resp.data;
          payload = {
            temperature: m?.temperature ?? 50, courant: m?.courant ?? 15,
            vibration: m?.vibration ?? 0.3, couple: 170, rpm: m?.rpm ?? 1480,
            failure_probability: 0.5, component_health_score: 0.5,
          };
        } catch {
          payload = { temperature: 50, courant: 15, vibration: 0.3, couple: 170, rpm: 1480, failure_probability: 0.5, component_health_score: 0.5 };
        }
        source = `Live sensor data — ${selectedMachineLabel}`;
        scenarioLabel = "Live measurement";
      } else {
        payload = selectedScenario.payload!;
        source = `Scenario — ${selectedScenario.label} — ${selectedMachineLabel}`;
        scenarioLabel = selectedScenario.label;
      }

      const result = await postAiDiagnostic(payload);
      setDiagnostic(result);
      setSourceLabel(source);
      setActiveScenarioLabel(scenarioLabel);
      toast.success("Diagnosis completed");
    } catch (err: any) {
      toast.error(err?.message || "Diagnosis failed — is the AI service running?");
    } finally {
      setLoading(false);
    }
  }

  if (machinesLoading) {
    return (
      <DashboardLayout title="AI Diagnosis" subtitle="Loading machines..." roleLabel="Operator">
        <Loader />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="AI Diagnosis"
      subtitle="Run an intelligent motor diagnosis and receive recommendations."
      roleLabel="Operator"
    >
      {/* Setup */}
      <div className="v2-card v2-card-pad">
        <div className="v2-card-head"><h3>Diagnostic setup</h3></div>

        <div className="v2-field-grid">
          <div className="v2-field">
            <label>Select motor</label>
            <select
              className="v2-input"
              value={selectedMachineId}
              onChange={(e) => setSelectedMachineId(e.target.value)}
            >
              {(machines ?? []).map((machine: any) => (
                <option key={machine.id} value={String(machine.id)}>
                  {machine.nom} — {machine.emplacement}
                </option>
              ))}
            </select>
          </div>
          <div className="v2-field">
            <label>&nbsp;</label>
            <button
              type="button"
              className="v2-btn v2-btn-primary"
              onClick={runDiagnosis}
              disabled={loading}
              style={{ width: "100%" }}
            >
              <PlayCircle size={17} />
              {loading ? "Analyzing..." : "Run diagnosis"}
            </button>
          </div>
        </div>

        <div style={{ marginTop: 20 }}>
          <div style={{ marginBottom: 12 }}>
            <h4 style={{ fontSize: ".92rem", margin: 0 }}>Choose a scenario</h4>
            <p style={{ fontSize: ".84rem", color: "var(--muted)", marginTop: 4 }}>
              Use live sensor data from the selected machine, or a controlled diagnostic scenario.
            </p>
          </div>
          <div className="v2-scenario-pills">
            {scenarios.map((scenario) => (
              <button
                key={scenario.key}
                type="button"
                className={`v2-scenario-pill${selectedScenarioKey === scenario.key ? " selected" : ""}`}
                onClick={() => setSelectedScenarioKey(scenario.key)}
                disabled={loading}
              >
                <span style={{ display: "inline-flex" }}>{getScenarioIcon(scenario.key)}</span>
                <span className={`tag ${scenario.tone}`}>{scenario.tag}</span>
                <span>{scenario.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Result */}
      <div className="v2-card v2-card-pad">
        <div className="v2-card-head" style={{ alignItems: "center" }}>
          <h3>Diagnostic result</h3>
          {sourceLabel && <span className="v2-badge neutral">{sourceLabel}</span>}
        </div>

        {loading ? (
          <Loader />
        ) : diagnostic ? (
          <div className="v2-stack">
            <div className="v2-result-bar">
              <div className="v2-result-cell">
                <span className="ri t-purple"><Brain size={20} strokeWidth={2.2} /></span>
                <div>
                  <div className="lbl">Selected scenario</div>
                  <strong>{activeScenarioLabel}</strong>
                </div>
              </div>
              <div className="v2-result-cell">
                <span className="ri t-green"><Cpu size={20} strokeWidth={2.2} /></span>
                <div>
                  <div className="lbl">Target motor</div>
                  <strong>{selectedMachineLabel}</strong>
                </div>
              </div>
              <div className="v2-result-cell">
                <span className="ri t-ok"><PlayCircle size={20} strokeWidth={2.2} /></span>
                <div>
                  <div className="lbl">Status</div>
                  <strong>Completed</strong>
                </div>
              </div>
            </div>
            <AiDiagnosticCard diagnostic={diagnostic} />
          </div>
        ) : (
          <div className="v2-empty">
            No diagnosis yet. Choose a motor, select a scenario and run the engine.
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
