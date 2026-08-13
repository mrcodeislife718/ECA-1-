export type RuntimeRecordStatus = "requested" | "authorized" | "running" | "succeeded" | "failed" | "denied" | "cancelled";
export type RuntimeFailureClass = "validation" | "authorization" | "capability" | "resource" | "timeout" | "external" | "verification" | "state" | "internal" | "cancelled";

export interface RuntimeActorIdentity { actorId: string; actorKind: string; authorityDomain?: string; }
export interface RuntimeCapabilityIdentity { capabilityId: string; version?: string; provider?: string; }
export interface RuntimeAuthorityGrant { grantId: string; issuerId: string; scopes: string[]; issuedAt: string; expiresAt?: string; revokedAt?: string; revocationRef?: string; }
export interface RuntimeEvidenceRecord { evidenceId: string; kind: string; provenance: string; contentHash?: string; producedBy?: string; observedAt?: string; payload: Record<string, unknown>; }
export interface RuntimeVerificationClaim { claimId: string; verifierId: string; requirement: string; passed: boolean; evidenceRefs: string[]; method?: string; verifiedAt: string; }
export interface RuntimeStateChange { stateId: string; kind: string; beforeRef?: string; afterRef?: string; delta: Record<string, unknown>; }
export interface RuntimeCheckpointRecord { checkpointId: string; stateRefs: string[]; reversible: boolean; createdAt: string; }
export interface RuntimeRecoveryRecord { recoveryId: string; triggerEventId: string; strategy: string; outcome: string; checkpointRef?: string; }
export interface RuntimeResourceUsage { wallTimeMs?: number; cpuTimeMs?: number; memoryBytesPeak?: number; networkBytes?: number; costUnits?: number; }
export interface RuntimeIntegrityRecord { algorithm: "sha256" | string; contentHash: string; previousHash?: string; }
export interface RuntimeFailureRecord { failureId: string; failureClass: RuntimeFailureClass; code: string; message: string; retryable: boolean; details: Record<string, unknown>; }

export interface RuntimeRecordRequest {
  protocolVersion: "1.1";
  requestId: string;
  eventId: string;
  causalParentIds: string[];
  sequence?: number;
  systemId: string;
  systemKind: string;
  missionId?: string;
  actor?: RuntimeActorIdentity;
  capability: string;
  capabilityIdentity?: RuntimeCapabilityIdentity;
  intent: Record<string, unknown>;
  authority: Record<string, unknown>;
  authorityGrants: RuntimeAuthorityGrant[];
  evidenceRefs: string[];
  stateRefs: string[];
  verificationRequirements: string[];
  checkpointRef?: string;
  integrity?: RuntimeIntegrityRecord;
  createdAt: string;
}

export interface RuntimeRecordReceipt {
  protocolVersion: "1.1";
  requestId: string;
  eventId: string;
  causalParentIds: string[];
  sequence?: number;
  systemId: string;
  status: RuntimeRecordStatus;
  output: Record<string, unknown>;
  evidence: RuntimeEvidenceRecord[];
  verification: RuntimeVerificationClaim[];
  stateChanges: RuntimeStateChange[];
  checkpoint?: RuntimeCheckpointRecord;
  recovery?: RuntimeRecoveryRecord;
  resourceUsage?: RuntimeResourceUsage;
  failure?: RuntimeFailureRecord;
  integrity?: RuntimeIntegrityRecord;
  startedAt?: string;
  completedAt: string;
}
