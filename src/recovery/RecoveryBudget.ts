export type RecoveryBudgetLimits = {
  maxAttempts: number;
  maxElapsedMs: number;
  maxCumulativeRisk: number;
  maxCumulativeCost: number;
};

export type RecoveryBudgetState = {
  attempts: number;
  startedAt: number;
  cumulativeRisk: number;
  cumulativeCost: number;
};

export class RecoveryBudget {
  private stateValue: RecoveryBudgetState;

  constructor(private readonly limits: RecoveryBudgetLimits, startedAt = Date.now()) {
    this.stateValue = {
      attempts: 0,
      startedAt,
      cumulativeRisk: 0,
      cumulativeCost: 0
    };
  }

  canAttempt(risk: number, cost: number, now = Date.now()): { allowed: boolean; reasons: string[] } {
    const reasons: string[] = [];
    if (this.stateValue.attempts >= this.limits.maxAttempts) reasons.push("attempt-limit");
    if (now - this.stateValue.startedAt > this.limits.maxElapsedMs) reasons.push("time-limit");
    if (this.stateValue.cumulativeRisk + risk > this.limits.maxCumulativeRisk) reasons.push("risk-budget");
    if (this.stateValue.cumulativeCost + cost > this.limits.maxCumulativeCost) reasons.push("cost-budget");
    return { allowed: reasons.length === 0, reasons };
  }

  consume(risk: number, cost: number, now = Date.now()): RecoveryBudgetState {
    const decision = this.canAttempt(risk, cost, now);
    if (!decision.allowed) throw new Error(`Recovery budget exceeded: ${decision.reasons.join(", ")}`);
    this.stateValue = {
      ...this.stateValue,
      attempts: this.stateValue.attempts + 1,
      cumulativeRisk: this.stateValue.cumulativeRisk + risk,
      cumulativeCost: this.stateValue.cumulativeCost + cost
    };
    return this.state();
  }

  state(): RecoveryBudgetState {
    return { ...this.stateValue };
  }
}
