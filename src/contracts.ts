export type Confidence = number;

export type RobotState = {
  timestamp: number;
  body: Record<string, unknown>;
  world: Record<string, unknown>;
  mission: Record<string, unknown>;
  health: Record<string, unknown>;
};

export type SensorObservation = {
  source: string;
  kind: string;
  timestamp: number;
  data: unknown;
  confidence: Confidence;
  health: "nominal" | "degraded" | "failed" | "unknown";
};

export type Capability = {
  id: string;
  description: string;
  maxLatencyMs: number;
  requiresUplink?: boolean;
  constraints?: Record<string, unknown>;
};

export type CandidateAction = {
  id: string;
  capability: string;
  command: Record<string, unknown>;
  reason: string;
  confidence: Confidence;
  createdAt: number;
};

export type ClearanceDecision = {
  allowed: boolean;
  reasons: string[];
  authority: string;
  expiresAt: number;
};

export type ActuationResult = {
  accepted: boolean;
  completed: boolean;
  timestamp: number;
  outcome: Record<string, unknown>;
  fault?: string;
};

export type PlatformAdapter = {
  id: string;
  capabilities(): Promise<Capability[]>;
  sense(): Promise<SensorObservation[]>;
  snapshot(): Promise<RobotState>;
  execute(action: CandidateAction, clearance: ClearanceDecision): Promise<ActuationResult>;
  emergencyStop(reason: string): Promise<void>;
};

export type Discrepancy = {
  id: string;
  expected: Record<string, unknown>;
  observed: Record<string, unknown>;
  magnitude: number;
  uncertainty: number;
  hypotheses: string[];
  hazard: "none" | "low" | "medium" | "high" | "critical";
  createdAt: number;
};

export type EvidenceRecord = {
  id: string;
  timestamp: number;
  kind: string;
  source: string;
  payload: unknown;
  confidence: Confidence;
  provenance: string[];
};
