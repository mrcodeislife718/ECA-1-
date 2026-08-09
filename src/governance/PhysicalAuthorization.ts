import type { CandidateAction, ClearanceDecision, RobotState } from "../contracts.js";

export type AuthorizationPolicy = {
  authority: string;
  ttlMs: number;
  evaluate(action: CandidateAction, state: RobotState): string[];
};

export class PhysicalAuthorization {
  constructor(private readonly policy: AuthorizationPolicy) {}

  clear(action: CandidateAction, state: RobotState): ClearanceDecision {
    const reasons = this.policy.evaluate(action, state);
    return {
      allowed: reasons.length === 0,
      reasons,
      authority: this.policy.authority,
      expiresAt: Date.now() + this.policy.ttlMs
    };
  }

  assertFresh(decision: ClearanceDecision): void {
    if (!decision.allowed) throw new Error(`Physical action denied: ${decision.reasons.join(", ")}`);
    if (Date.now() > decision.expiresAt) throw new Error("Physical clearance expired");
  }
}
