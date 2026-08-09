import type {
  ActuationResult,
  CandidateAction,
  Capability,
  ClearanceDecision,
  PlatformAdapter,
  RobotState,
  SensorObservation
} from "../contracts.js";

export type SimulatedFault =
  | "none"
  | "sensor-degraded"
  | "sensor-failed"
  | "actuator-degraded"
  | "restricted-zone"
  | "emergency-stop"
  | "uplink-loss"
  | "thermal-drift";

export type SimulatedEmbodimentConfig = {
  id: string;
  kind: "industrial-arm" | "mobile-base" | "aerial-platform" | "humanoid-style";
  capabilities: Capability[];
  initialBody?: Record<string, unknown>;
  initialWorld?: Record<string, unknown>;
  initialMission?: Record<string, unknown>;
};

export class SimulatedEmbodiment implements PlatformAdapter {
  readonly id: string;
  readonly kind: SimulatedEmbodimentConfig["kind"];
  private readonly capabilitySet: Capability[];
  private body: Record<string, unknown>;
  private world: Record<string, unknown>;
  private mission: Record<string, unknown>;
  private fault: SimulatedFault = "none";
  private estop = false;
  private sequence = 0;

  constructor(config: SimulatedEmbodimentConfig) {
    this.id = config.id;
    this.kind = config.kind;
    this.capabilitySet = config.capabilities.map((item) => ({ ...item }));
    this.body = { speed: 0, temperatureC: 25, energy: 1, ...(config.initialBody ?? {}) };
    this.world = { restricted: false, ...(config.initialWorld ?? {}) };
    this.mission = { authorized: true, ...(config.initialMission ?? {}) };
  }

  setFault(fault: SimulatedFault): void {
    this.fault = fault;
    this.estop = fault === "emergency-stop";
    if (fault === "restricted-zone") this.world = { ...this.world, restricted: true };
    if (fault === "thermal-drift") this.body = { ...this.body, temperatureC: 92 };
  }

  clearFault(): void {
    this.fault = "none";
    this.estop = false;
    this.world = { ...this.world, restricted: false };
  }

  async capabilities(): Promise<Capability[]> {
    return this.capabilitySet.map((item) => ({ ...item }));
  }

  async sense(): Promise<SensorObservation[]> {
    const now = Date.now();
    const degraded = this.fault === "sensor-degraded";
    const failed = this.fault === "sensor-failed";
    return [
      {
        source: `${this.id}:body`,
        kind: "body:state",
        timestamp: now,
        data: { ...this.body },
        confidence: failed ? 0.05 : degraded ? 0.45 : 0.99,
        health: failed ? "failed" : degraded ? "degraded" : "nominal"
      },
      {
        source: `${this.id}:world`,
        kind: "world:state",
        timestamp: now,
        data: { ...this.world },
        confidence: failed ? 0.1 : degraded ? 0.5 : 0.98,
        health: failed ? "failed" : degraded ? "degraded" : "nominal"
      }
    ];
  }

  async snapshot(): Promise<RobotState> {
    return {
      timestamp: Date.now(),
      body: { ...this.body, embodimentKind: this.kind, sequence: this.sequence },
      world: { ...this.world, uplink: this.fault === "uplink-loss" ? "disconnected" : "nominal" },
      mission: { ...this.mission },
      health: {
        emergencyStop: this.estop,
        actuator: this.fault === "actuator-degraded" ? "degraded" : "nominal",
        sensor: this.fault === "sensor-failed" ? "failed" : this.fault === "sensor-degraded" ? "degraded" : "nominal"
      }
    };
  }

  async execute(action: CandidateAction, clearance: ClearanceDecision): Promise<ActuationResult> {
    if (!clearance.allowed || clearance.expiresAt < Date.now()) {
      return { accepted: false, completed: false, timestamp: Date.now(), outcome: {}, fault: "clearance-invalid" };
    }
    if (this.estop) {
      return { accepted: false, completed: false, timestamp: Date.now(), outcome: {}, fault: "emergency-stop-active" };
    }
    if (this.fault === "actuator-degraded") {
      return { accepted: true, completed: false, timestamp: Date.now(), outcome: { partial: true }, fault: "actuator-degraded" };
    }
    this.sequence += 1;
    this.body = { ...this.body, lastCapability: action.capability, lastCommand: action.command };
    return { accepted: true, completed: true, timestamp: Date.now(), outcome: { capability: action.capability, sequence: this.sequence } };
  }

  async emergencyStop(reason: string): Promise<void> {
    this.estop = true;
    this.body = { ...this.body, stopReason: reason, speed: 0 };
  }
}

export function standardSimulatedEmbodiments(): SimulatedEmbodiment[] {
  const move: Capability = { id: "move", description: "Move embodiment", maxLatencyMs: 80 };
  return [
    new SimulatedEmbodiment({ id: "sim-arm", kind: "industrial-arm", capabilities: [move, { id: "grasp", description: "Grip object", maxLatencyMs: 120 }] }),
    new SimulatedEmbodiment({ id: "sim-mobile", kind: "mobile-base", capabilities: [move, { id: "navigate", description: "Navigate space", maxLatencyMs: 100 }] }),
    new SimulatedEmbodiment({ id: "sim-drone", kind: "aerial-platform", capabilities: [move, { id: "stabilize", description: "Maintain flight stability", maxLatencyMs: 20 }] }),
    new SimulatedEmbodiment({ id: "sim-humanoid", kind: "humanoid-style", capabilities: [move, { id: "balance", description: "Maintain balance", maxLatencyMs: 20 }] })
  ];
}
