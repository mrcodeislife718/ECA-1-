export type RuntimeRecordStatus = "requested" | "running" | "succeeded" | "failed" | "denied";

export interface RuntimeRecordRequest {
  protocolVersion: "1.0";
  requestId: string;
  systemId: string;
  systemKind: string;
  missionId?: string;
  capability: string;
  intent: Record<string, unknown>;
  authority: Record<string, unknown>;
  evidenceRefs: string[];
  stateRefs: string[];
  verificationRequirements: string[];
  createdAt: string;
}

export interface RuntimeRecordReceipt {
  protocolVersion: "1.0";
  requestId: string;
  systemId: string;
  status: RuntimeRecordStatus;
  output: Record<string, unknown>;
  evidence: Record<string, unknown>[];
  verification: Record<string, unknown>[];
  stateChanges: Record<string, unknown>[];
  failure?: Record<string, unknown>;
  completedAt: string;
}
