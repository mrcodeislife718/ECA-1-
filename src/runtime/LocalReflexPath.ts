import type { SensorObservation } from "../contracts.js";

export type ReflexDecision = { triggered: boolean; reason?: string; action: "none" | "hold" | "safe-stop" | "emergency-stop" };

export class LocalReflexPath {
  evaluate(observations: SensorObservation[]): ReflexDecision {
    for (const observation of observations) {
      const kind = observation.kind.toLowerCase();
      if (observation.health === "failed" && /proximity|force|temperature|power|collision/.test(kind)) {
        return { triggered: true, reason: `Critical sensor failure: ${observation.kind}`, action: "safe-stop" };
      }
      if (/collision|emergency/.test(kind) && observation.confidence >= 0.8) {
        return { triggered: true, reason: `Immediate hazard: ${observation.kind}`, action: "emergency-stop" };
      }
    }
    return { triggered: false, action: "none" };
  }
}
