import type { SensorObservation } from "../contracts.js";

export type EnvironmentStatus = "validated" | "bounded-novel" | "novel" | "contradictory" | "unsafe";

export type EnvironmentConstraint = {
  key: string;
  min?: number;
  max?: number;
  allowed?: unknown[];
  critical?: boolean;
};

export type EnvironmentAssessment = {
  status: EnvironmentStatus;
  reasons: string[];
  confidence: number;
  observedKeys: string[];
};

/**
 * Keeps ECA-1 from pretending an unfamiliar environment is familiar.
 * Deployments can define validated envelopes without coupling cognition to a
 * particular robot body or industry.
 */
export class EnvironmentEnvelope {
  constructor(private readonly constraints: EnvironmentConstraint[]) {}

  assess(observations: SensorObservation[]): EnvironmentAssessment {
    const reasons: string[] = [];
    let unsafe = false;
    let contradiction = false;
    let novelty = 0;
    const byKind = new Map<string, SensorObservation[]>();

    for (const observation of observations) {
      const list = byKind.get(observation.kind) ?? [];
      list.push(observation);
      byKind.set(observation.kind, list);
      if (observation.health === "failed") reasons.push(`failed-sensor:${observation.kind}`);
      if (observation.confidence < 0.4) reasons.push(`low-confidence:${observation.kind}`);
    }

    for (const [kind, list] of byKind) {
      if (list.length > 1) {
        const serialized = new Set(list.map((item) => JSON.stringify(item.data)));
        if (serialized.size > 1 && list.every((item) => item.confidence >= 0.7)) {
          contradiction = true;
          reasons.push(`contradictory:${kind}`);
        }
      }
    }

    for (const constraint of this.constraints) {
      const observation = byKind.get(constraint.key)?.[0];
      if (!observation) {
        novelty += 1;
        reasons.push(`unobserved:${constraint.key}`);
        continue;
      }
      const value = observation.data;
      let violation = false;
      if (typeof value === "number") {
        if (constraint.min !== undefined && value < constraint.min) violation = true;
        if (constraint.max !== undefined && value > constraint.max) violation = true;
      }
      if (constraint.allowed && !constraint.allowed.some((allowed) => Object.is(allowed, value))) violation = true;
      if (violation) {
        reasons.push(`out-of-envelope:${constraint.key}`);
        if (constraint.critical) unsafe = true;
        else novelty += 2;
      }
    }

    const averageConfidence = observations.length
      ? observations.reduce((sum, item) => sum + item.confidence, 0) / observations.length
      : 0;

    const status: EnvironmentStatus = unsafe
      ? "unsafe"
      : contradiction
        ? "contradictory"
        : novelty >= 3
          ? "novel"
          : novelty > 0
            ? "bounded-novel"
            : "validated";

    return {
      status,
      reasons,
      confidence: Math.max(0, Math.min(1, averageConfidence)),
      observedKeys: [...byKind.keys()]
    };
  }
}
