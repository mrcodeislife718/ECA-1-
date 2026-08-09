import type { ActuationResult, CandidateAction, Capability, ClearanceDecision, RobotState, SensorObservation } from "../contracts.js";

export type TransportKind = string;
export type ProtocolKind = string;

export type PhysicalEndpoint = {
  id: string;
  role: "sensor" | "actuator" | "controller" | "safety" | "power" | "compute" | "transport" | string;
  transport: TransportKind;
  protocol?: ProtocolKind;
  address?: string;
  local: boolean;
  deterministic?: boolean;
  maxRoundTripMs?: number;
  metadata?: Record<string, unknown>;
};

export type PhysicalRobotDescriptor = {
  id: string;
  manufacturer?: string;
  model?: string;
  serial?: string;
  firmware?: string;
  operatingSystem?: string;
  architecture?: string;
  endpoints: PhysicalEndpoint[];
  metadata?: Record<string, unknown>;
};

export type PhysicalRobotDriver = {
  descriptor(): Promise<PhysicalRobotDescriptor>;
  capabilities(): Promise<Capability[]>;
  readSensors(): Promise<SensorObservation[]>;
  readState(): Promise<RobotState>;
  writeAction(action: CandidateAction, clearance: ClearanceDecision): Promise<ActuationResult>;
  emergencyStop(reason: string): Promise<void>;
  heartbeat?(): Promise<{ healthy: boolean; timestamp: number; details?: Record<string, unknown> }>;
  close?(): Promise<void>;
};

/**
 * ECA-1's physical integration boundary. Real robots connect here through
 * drivers that translate native hardware/protocol behavior into universal
 * ECA-1 capability, sensing, state, actuation, and safety contracts.
 * No robotics framework, vendor SDK, bus, protocol, OS, or embodiment is
 * allowed to become a dependency of the cognitive core.
 */
export interface UniversalPhysicalRobotContract extends PhysicalRobotDriver {}
