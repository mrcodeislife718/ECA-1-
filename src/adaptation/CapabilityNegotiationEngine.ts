import type { Capability } from "../contracts.js";

export type MissionCapabilityRequirement = {
  id: string;
  required: boolean;
  maxLatencyMs?: number;
  constraints?: Record<string, unknown>;
};

export type NegotiatedCapability = {
  id: string;
  status: "ready" | "degraded" | "missing" | "too-slow" | "constraint-review";
  capability?: Capability;
  reasons: string[];
};

export class CapabilityNegotiationEngine {
  negotiate(available: Capability[], required: MissionCapabilityRequirement[]): NegotiatedCapability[] {
    return required.map((requirement) => {
      const capability = available.find((item) => item.id === requirement.id);
      if (!capability) {
        return {
          id: requirement.id,
          status: "missing",
          reasons: [requirement.required ? "required-capability-missing" : "optional-capability-missing"]
        };
      }

      const reasons: string[] = [];
      if (requirement.maxLatencyMs !== undefined && capability.maxLatencyMs > requirement.maxLatencyMs) {
        reasons.push(`latency:${capability.maxLatencyMs}>${requirement.maxLatencyMs}`);
      }
      if (requirement.constraints && Object.keys(requirement.constraints).length > 0) {
        reasons.push("constraints-require-validation");
      }

      return {
        id: requirement.id,
        capability,
        status: reasons.some((reason) => reason.startsWith("latency:"))
          ? "too-slow"
          : reasons.length > 0
            ? "constraint-review"
            : "ready",
        reasons
      };
    });
  }

  missionReady(results: NegotiatedCapability[], requirements: MissionCapabilityRequirement[]): boolean {
    const requiredIds = new Set(requirements.filter((item) => item.required).map((item) => item.id));
    return results.every((item) => !requiredIds.has(item.id) || item.status === "ready");
  }
}
