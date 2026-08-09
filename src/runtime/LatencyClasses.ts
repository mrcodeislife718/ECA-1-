export type LatencyClass = "L0" | "L1" | "L2" | "L3" | "L4" | "L5";

export type LatencyPolicy = {
  class: LatencyClass;
  maxLatencyMs: number;
  maxJitterMs: number;
  staleAfterMs: number;
  fallback: "continue" | "degrade" | "hold" | "safe-stop";
};

export class LatencyClassRegistry {
  private readonly policies = new Map<string, LatencyPolicy>();
  register(capabilityId: string, policy: LatencyPolicy): void { this.policies.set(capabilityId, policy); }
  policyFor(capabilityId: string): LatencyPolicy | undefined { return this.policies.get(capabilityId); }
  assertWithinBudget(capabilityId: string, elapsedMs: number): void {
    const policy = this.policies.get(capabilityId);
    if (policy && elapsedMs > policy.maxLatencyMs) throw new Error(`Latency budget exceeded for ${capabilityId}: ${elapsedMs}ms > ${policy.maxLatencyMs}ms`);
  }
}
