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
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
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
  toneClass: string;
  payload?: DiagnosticPayload;
};

const scenarios: Scenario[] = [
  {
    key: "live",
    label: "Live measurement",
    tag: "LIVE",
    toneClass: "scenario-live",
  },
  {
    key: "normal",
    label: "Normal operation",
    tag: "NOMINAL",
    toneClass: "scenario-normal",
    payload: {
      temperature: 45.0,
      courant: 12.0,
      vibration: 0.25,
      couple: 168.5,
      rpm: 1490,
      failure_probability: 0.08,
      component_health_score: 0.92,
    },
  },
  {
    key: "overheating",
    label: "Thermal overload",
    tag: "THERMAL",
    toneClass: "scenario-thermal",
    payload: {
      temperature: 95.0,
      courant: 28.0,
      vibration: 1.2,
      couple: 180.0,
      rpm: 1450.0,
      failure_probability: 0.82,
      component_health_score: 0.35,
    },
  },
  {
    key: "mechanical",
    label: "Mechanical wear",
    tag: "MECHANICAL",
    toneClass: "scenario-mechanical",
    payload: {
      temperature: 68.0,
      courant: 20.0,
      vibration: 2.1,
      couple: 165.0,
      rpm: 1380.0,
      failure_probability: 0.74,
      component_health_score: 0.40,
    },
  },
  {
    key: "electrical",
    label: "Electrical overload",
    tag: "ELECTRICAL",
    toneClass: "scenario-electrical",
    payload: {
      temperature: 78.0,
      courant: 48.0,
      vibration: 0.65,
      couple: 176.0,
      rpm: 1460.0,
      failure_probability: 0.79,
      component_health_score: 0.42,
    },
  },
  {
    key: "blockage",
    label: "Friction / blockage",
    tag: "BLOCKAGE",
    toneClass: "scenario-blockage",
    payload: {
      temperature: 82.0,
      courant: 38.0,
      vibration: 1.8,
      couple: 195.0,
      rpm: 620.0,
      failure_probability: 0.88,
      component_health_score: 0.28,
    },
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

export default function AdminAiDiagnosisPage() {
  const toast = useToast();

  // Fetch machines dynamically from API
  const { data: machines, loading: machinesLoading } = useApi(getMachines, [], 30_000);

  const [selectedMachineId, setSelectedMachineId] = useState<string>("");
  const [selectedScenarioKey, setSelectedScenarioKey] = useState("live");
  const [loading, setLoading] = useState(false);
  const [diagnostic, setDiagnostic] = useState<AiDiagnosticResponse | null>(null);
  const [sourceLabel, setSourceLabel] = useState("");
  const [activeScenarioLabel, setActiveScenarioLabel] = useState("Live measurement");

  // Auto-select first machine when machines load
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

  async function fetchLivePayload(machineId: string): Promise<DiagnosticPayload> {
    try {
      const resp = await api.get(`/api/mesures/derniere`, { params: { machineId } });
      const m = resp.data;
      if (m) {
        return {
          temperature: m.temperature ?? 50,
          courant: m.courant ?? 15,
          vibration: m.vibration ?? 0.3,
          couple: 170,
          rpm: m.rpm ?? 1480,
          failure_probability: 0.5,
          component_health_score: 0.5,
        };
      }
    } catch {
      // Fallback if no measurement
    }
    return {
      temperature: 50, courant: 15, vibration: 0.3,
      couple: 170, rpm: 1480, failure_probability: 0.5, component_health_score: 0.5,
    };
  }

  async function runDiagnosis() {
    setLoading(true);
    try {
      let payload: DiagnosticPayload;
      let source: string;
      let scenarioLabel: string;

      if (selectedScenarioKey === "live") {
        payload = await fetchLivePayload(selectedMachineId);
        source = `Live sensor data — ${selectedMachineLabel}`;
        scenarioLabel = "Live measurement";
      } else {
        payload = selectedScenario.payload!;
        source = `Scenario — ${selectedScenario.label} — ${selectedMachineLabel}`;
        scenarioLabel = selectedScenario.label;
      }

      // Call real AI API
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
      <DashboardLayout title="AI Diagnosis" subtitle="Loading machines..." roleLabel="Administrator">
        <Loader />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="AI Diagnosis"
      subtitle="Run an intelligent motor diagnosis and receive recommendations."
      roleLabel="Administrator"
    >
      <div className="stack">
        <Card className="info-card">
          <div className="card-title-row">
            <h3>Diagnostic setup</h3>
          </div>

          <div className="ai-setup-grid">
            <div className="ai-setup-field">
              <label className="ai-setup-label">Select motor</label>
              <div className="ai-select-wrap">
                <div className="ai-select-icon">
                  <Cpu size={18} strokeWidth={2.2} />
                </div>
                <select
                  value={selectedMachineId}
                  onChange={(e) => setSelectedMachineId(e.target.value)}
                  className="ai-select"
                >
                  {(machines ?? []).map((machine: any) => (
                    <option key={machine.id} value={String(machine.id)}>
                      {machine.nom} — {machine.emplacement}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="ai-setup-field">
              <label className="ai-setup-label">Run diagnosis</label>
              <Button
                variant="secondary"
                onClick={runDiagnosis}
                disabled={loading}
                style={{ minHeight: 46 }}
              >
                {loading ? "Analyzing..." : "Run diagnosis"}
              </Button>
            </div>
          </div>

          <div className="ai-scenario-section">
            <div className="ai-scenario-section-header">
              <h4>Choose a scenario</h4>
              <span className="ai-scenario-caption">
                Use live sensor data from the selected machine, or a controlled diagnostic scenario.
              </span>
            </div>

            <div className="ai-scenario-pills improved-scenario-pills">
              {scenarios.map((scenario) => (
                <button
                  key={scenario.key}
                  type="button"
                  className={`ai-scenario-pill improved-scenario-pill ${
                    selectedScenarioKey === scenario.key ? "ai-scenario-pill-selected" : ""
                  } ${scenario.toneClass}`}
                  onClick={() => setSelectedScenarioKey(scenario.key)}
                  disabled={loading}
                >
                  <span className="ai-scenario-icon">{getScenarioIcon(scenario.key)}</span>
                  <span className="ai-scenario-tag">{scenario.tag}</span>
                  <span>{scenario.label}</span>
                </button>
              ))}
            </div>
          </div>
        </Card>

        <Card className="info-card">
          <div className="card-title-row">
            <h3>Diagnostic result</h3>
            {sourceLabel && <span className="data-badge badge-normal">Source: {sourceLabel}</span>}
          </div>

          {loading ? (
            <Loader />
          ) : diagnostic ? (
            <div className="stack">
              <div className="ai-result-summary-bar">
                <div className="ai-result-summary-left">
                  <div className="ai-result-main-icon">
                    <Brain size={20} strokeWidth={2.2} />
                  </div>
                  <div>
                    <div className="ai-result-summary-label">Selected scenario</div>
                    <strong className="ai-result-summary-value">{activeScenarioLabel}</strong>
                  </div>
                </div>

                <div className="ai-result-summary-left">
                  <div className="ai-result-main-icon motor-tone">
                    <Cpu size={20} strokeWidth={2.2} />
                  </div>
                  <div>
                    <div className="ai-result-summary-label">Target motor</div>
                    <strong className="ai-result-summary-value">{selectedMachineLabel}</strong>
                  </div>
                </div>

                <div className="ai-result-summary-action">
                  <PlayCircle size={18} strokeWidth={2.2} />
                  <span>Diagnosis completed</span>
                </div>
              </div>

              <AiDiagnosticCard diagnostic={diagnostic} />
            </div>
          ) : (
            <div className="centered-empty">
              No diagnosis yet. Choose a motor, select a scenario and run the engine.
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
