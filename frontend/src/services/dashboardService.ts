import api from "./api";
import type {
  AiDiagnosticResponse,
  AlerteApi,
  AnomalieApi,
  DashboardResponse,
  DashboardStats,
  DecisionThresholdConfig,
  MesureApi,
  MesureDashboard,
  OperationalDashboardResponse,
  PredictionApi,
  RulPredictionResponse,
} from "../types";

function normalizeAiResponse(response: AiDiagnosticResponse): AiDiagnosticResponse {
  const causeMap: Record<string, string> = {
    "Aucune cause anormale significative détectée": "No significant abnormal cause detected",
    "Problème de refroidissement ou surcharge thermique": "Cooling issue or thermal overload",
    "Usure mécanique probable ou désalignement": "Probable mechanical wear or misalignment",
    "Effort moteur excessif ou alimentation anormale": "Excessive motor load or abnormal power supply",
    "Résistance mécanique excessive ou blocage partiel": "Excessive mechanical resistance or partial blockage",
    "Dégradation avancée de l'état de fonctionnement": "Advanced degradation of the operating condition",
  };

  const recommendationMap: Record<string, string> = {
    "Poursuivre la surveillance normale": "Continue normal monitoring",
    "Vérifier le système de refroidissement et la charge appliquée": "Inspect the cooling system and review the applied load",
    "Inspecter les roulements et vérifier l'alignement mécanique": "Inspect the bearings and verify mechanical alignment",
    "Contrôler l'alimentation électrique et réduire la charge": "Check the power supply and reduce the operating load",
    "Inspecter les composants mobiles et rechercher un blocage": "Inspect moving components and investigate a possible blockage",
    "Planifier une inspection complète de la machine": "Plan a full machine inspection",
  };

  return {
    ...response,
    cause_probable: causeMap[response.cause_probable] ?? response.cause_probable,
    recommandation: recommendationMap[response.recommandation] ?? response.recommandation,
  };
}

export async function getDashboardData(): Promise<DashboardResponse> {
  const response = await api.get<DashboardResponse>("/api/dashboard");
  return response.data;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const response = await api.get<DashboardStats>("/api/dashboard/stats");
  return response.data;
}

export async function getRecentMeasures(): Promise<MesureDashboard[]> {
  const response = await api.get<MesureDashboard[]>("/api/dashboard/mesures-recentes");
  return response.data;
}

export async function getMesures(): Promise<MesureApi[]> {
  const response = await api.get<MesureApi[]>("/api/mesures");
  return response.data;
}

export async function getRecentMesuresOnly(): Promise<MesureApi[]> {
  const response = await api.get<MesureApi[]>("/api/mesures/recentes");
  return response.data;
}

export async function getAlertes(): Promise<AlerteApi[]> {
  const response = await api.get<AlerteApi[]>("/api/alertes");
  return response.data;
}

export async function getAnomalies(): Promise<AnomalieApi[]> {
  const response = await api.get<AnomalieApi[]>("/api/anomalies");
  return response.data;
}

export async function getPredictions(): Promise<PredictionApi[]> {
  const response = await api.get<PredictionApi[]>("/api/predictions");
  return response.data;
}

export async function getOperationalDashboard(machineId?: number): Promise<OperationalDashboardResponse> {
  const response = await api.get<OperationalDashboardResponse>("/api/dashboard/operational-ml", {
    params: machineId ? { machineId } : undefined,
  });
  return response.data;
}

export async function getRulTrend(machineId?: number): Promise<RulPredictionResponse[]> {
  const url = machineId ? `/api/predictions/rul/${machineId}` : "/api/predictions/rul";
  const response = await api.get<RulPredictionResponse[]>(url);
  return response.data;
}

export async function runRulPrediction(machineId: number): Promise<RulPredictionResponse> {
  const response = await api.post<RulPredictionResponse>(`/api/predictions/predict-rul/${machineId}`);
  return response.data;
}

export async function acknowledgeAlert(id: number, user = "dashboard"): Promise<AlerteApi> {
  const response = await api.post<AlerteApi>(`/api/alertes/${id}/acknowledge`, { user });
  return response.data;
}

export async function assignAlert(id: number, technician: string): Promise<AlerteApi> {
  const response = await api.post<AlerteApi>(`/api/alertes/${id}/assign`, { technician });
  return response.data;
}

export async function resolveAlert(id: number, user = "dashboard", resolutionNotes = ""): Promise<AlerteApi> {
  const response = await api.post<AlerteApi>(`/api/alertes/${id}/resolve`, {
    user,
    resolutionNotes,
  });
  return response.data;
}

export async function escalateOverdueAlerts(): Promise<AlerteApi[]> {
  const response = await api.post<AlerteApi[]>("/api/alertes/escalate-overdue");
  return response.data;
}

export async function getDecisionThresholds(): Promise<DecisionThresholdConfig> {
  const response = await api.get<DecisionThresholdConfig>("/api/decision-thresholds");
  return response.data;
}

export async function saveDecisionThresholds(payload: DecisionThresholdConfig): Promise<DecisionThresholdConfig> {
  const response = await api.post<DecisionThresholdConfig>("/api/decision-thresholds", payload);
  return response.data;
}

// ── Machines ──
export async function getMachines(): Promise<any[]> {
  const response = await api.get<any[]>("/api/machines");
  return response.data;
}

// ── Users ──
export async function getUtilisateurs(): Promise<any[]> {
  const response = await api.get<any[]>("/api/utilisateurs");
  return response.data;
}

// ── Latest measure per machine ──
export async function getLatestMeasureForMachine(machineId: number): Promise<any> {
  const response = await api.get<any>(`/api/mesures/derniere`, { params: { machineId } });
  return response.data;
}

export async function getLatestAiDiagnostic(): Promise<AiDiagnosticResponse> {
  const response = await api.get<AiDiagnosticResponse>("/api/ia/diagnostic/derniere-mesure");
  return normalizeAiResponse(response.data);
}

export async function postAiDiagnostic(payload: {
  temperature: number;
  courant: number;
  vibration: number;
  couple: number;
  rpm: number;
  failure_probability: number;
  component_health_score: number;
}): Promise<AiDiagnosticResponse> {
  const response = await api.post<AiDiagnosticResponse>("/api/ia/predict", payload);
  return normalizeAiResponse(response.data);
}
