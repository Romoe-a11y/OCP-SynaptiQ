export interface LoginRequest {
  email: string;
  motDePasse: string;
}

export interface LoginResponse {
  id: number;
  nomComplet: string;
  email: string;
  role: "ADMIN" | "UTILISATEUR";
  message: string;
  accessToken: string;
  refreshToken: string;
}

export interface ProfileDetails {
  id: number;
  nomComplet: string;
  email: string;
  role: "ADMIN" | "UTILISATEUR";
  dateCreation?: string | null;
  lastLoginAt?: string | null;
  loginCount?: number | null;
  accountLocked?: boolean | null;
  failedAttempts?: number | null;
  notificationEmail?: boolean | null;
  notificationWebhook?: string | null;
  profilePictureUrl?: string | null;
  accessToken?: string | null;
  refreshToken?: string | null;
}

export interface ProfileUpdateRequest {
  nomComplet: string;
  email: string;
  notificationEmail: boolean;
  notificationWebhook?: string | null;
}

export interface PasswordChangeRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface UserAccess {
  id: number;
  nomComplet: string;
  email: string;
  role: "ADMIN" | "UTILISATEUR";
  dateCreation?: string | null;
  lastLoginAt?: string | null;
  loginCount?: number | null;
  accountLocked?: boolean | null;
  failedAttempts?: number | null;
  notificationEmail?: boolean | null;
  notificationWebhook?: string | null;
  active?: boolean | null;
  temporaryPassword?: string | null;
}

export interface UserAccessCreateRequest {
  nomComplet: string;
  email: string;
  role: "ADMIN" | "UTILISATEUR";
  password?: string;
  active: boolean;
  notificationEmail: boolean;
  notificationWebhook?: string | null;
}

export interface UserAccessUpdateRequest {
  nomComplet: string;
  email: string;
  role: "ADMIN" | "UTILISATEUR";
  active: boolean;
  notificationEmail: boolean;
  notificationWebhook?: string | null;
}

export interface MesureDashboardDto {
  id: number;
  nomMachine: string;
  horodatage: string;
  temperature: number;
  courant: number;
  vibration: number;
  rpm: number;
  statut: string;
  etiquetteAnomalie: boolean;
}

export interface AlerteDashboardDto {
  id: number;
  message: string;
  gravite: string;
  statut: string;
  dateCreation: string;
}

export interface AnomalieDashboardDto {
  id: number;
  type: string;
  description: string;
  gravite: string;
  score: number;
  dateDetection: string;
}

export interface PredictionDashboardDto {
  id: number;
  statutPredit: string;
  niveauRisque: string;
  confiance: number;
  dateCreation: string;
}

export interface DashboardResponse {
  derniereMesure: MesureDashboardDto | null;
  alertes: AlerteDashboardDto[];
  anomalies: AnomalieDashboardDto[];
  predictions: PredictionDashboardDto[];
}

export interface MachineRef {
  id?: number;
  nom?: string;
}

export interface MesureApi {
  id: number;
  machine?: MachineRef | null;
  horodatage?: string;
  temperature?: number;
  courant?: number;
  vibration?: number;
  rpm?: number;
  statut?: string;
  etiquetteAnomalie?: boolean;
}

export interface AlerteApi {
  id: number;
  message: string;
  gravite?: string;
  statut?: string;
  dateCreation?: string;
  machine?: MachineRef | null;
  assignedTechnician?: string;
  acknowledgedBy?: string;
  resolvedBy?: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  slaDeadline?: string;
  escalationLevel?: number;
  notificationChannel?: string;
  resolutionNotes?: string;
}

export interface AnomalieApi {
  id: number;
  type: string;
  description: string;
  gravite?: string;
  score?: number;
  dateDetection?: string;
}

export interface PredictionApi {
  id: number;
  statutPredit?: string;
  niveauRisque?: string;
  confiance?: number;
  dateCreation?: string;
  outputLabel?: string;
  probability?: number;
  anomalyScore?: number;
  rulHours?: number;
  rulDays?: number;
  finalDecision?: string;
  modelName?: string;
  modelVersion?: string;
  explanation?: string;
  rawOutputJson?: string;
  machine?: MachineRef | null;
}

export interface DashboardStats {
  totalMesures: number;
  totalAnomalies: number;
  totalAlertesActives: number;
  totalPredictionsCritiques: number;
}

export type MesureDashboard = MesureDashboardDto;

export interface AiDiagnosticResponse {
  diagnostic_label: string;
  cause_probable: string;
  recommandation: string;
  recommendation?: string;
  decision: string;
  input_data: {
    temperature: number;
    courant: number;
    vibration: number;
    couple: number;
    rpm: number;
    failure_probability: number;
    component_health_score: number;
  };
}

export interface RulPredictionResponse {
  machineId: number;
  predictedAt: string;
  rulHours?: number;
  rulDays?: number;
  confidence?: number;
  method?: string;
  simulated?: boolean;
  explanation?: string;
}

export interface DecisionThresholdConfig {
  id?: number;
  warningThreshold: number;
  urgentThreshold: number;
  stopThreshold: number;
  tuningGoal?: string;
  notes?: string;
  updatedAt?: string;
}

export interface OperationalPoint {
  [key: string]: string | number | boolean | null | undefined | OperationalPoint[];
}

export interface OperationalDashboardResponse {
  riskTimeline: OperationalPoint[];
  activeMachineStatus: OperationalPoint[];
  anomalyScoreTrend: OperationalPoint[];
  featureTrends: OperationalPoint[];
  alertHistory: OperationalPoint[];
  modelHealth: OperationalPoint;
  driftHealth: OperationalPoint;
  rulTrend: OperationalPoint[];
  predictionExplanations: OperationalPoint[];
}
