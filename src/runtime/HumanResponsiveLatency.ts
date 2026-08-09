export type ResponseClass = "hardware-emergency" | "reflex" | "sensorimotor" | "deliberative" | "background";

export type ResponseBudget = {
  responseClass: ResponseClass;
  targetMs: number;
  hardDeadlineMs: number;
  remoteDependencyAllowed: boolean;
  mayBlockFasterClass: false;
};

export type TimingMeasurement = {
  responseClass: ResponseClass;
  startedAt: number;
  completedAt: number;
  elapsedMs: number;
  targetMet: boolean;
  deadlineMet: boolean;
};

const DEFAULT_BUDGETS: Record<ResponseClass, ResponseBudget> = {
  "hardware-emergency": { responseClass: "hardware-emergency", targetMs: 5, hardDeadlineMs: 10, remoteDependencyAllowed: false, mayBlockFasterClass: false },
  reflex: { responseClass: "reflex", targetMs: 20, hardDeadlineMs: 50, remoteDependencyAllowed: false, mayBlockFasterClass: false },
  sensorimotor: { responseClass: "sensorimotor", targetMs: 80, hardDeadlineMs: 120, remoteDependencyAllowed: false, mayBlockFasterClass: false },
  deliberative: { responseClass: "deliberative", targetMs: 250, hardDeadlineMs: 500, remoteDependencyAllowed: true, mayBlockFasterClass: false },
  background: { responseClass: "background", targetMs: 1000, hardDeadlineMs: 5000, remoteDependencyAllowed: true, mayBlockFasterClass: false }
};

/**
 * Human-responsive timing policy for ECA-1.
 *
 * These are engineering targets, not universal physical guarantees. End-to-end
 * response time also depends on sensors, actuators, transport, scheduling,
 * hardware, and the deployment operating environment.
 */
export class HumanResponsiveLatency {
  constructor(private readonly budgets: Record<ResponseClass, ResponseBudget> = DEFAULT_BUDGETS) {}

  budget(responseClass: ResponseClass): ResponseBudget {
    return this.budgets[responseClass];
  }

  classify(urgency: number, hazard: "none" | "low" | "medium" | "high" | "critical"): ResponseClass {
    if (hazard === "critical") return "hardware-emergency";
    if (hazard === "high" || urgency >= 0.9) return "reflex";
    if (hazard === "medium" || urgency >= 0.65) return "sensorimotor";
    if (urgency >= 0.2) return "deliberative";
    return "background";
  }

  measure(responseClass: ResponseClass, startedAt: number, completedAt = Date.now()): TimingMeasurement {
    const budget = this.budget(responseClass);
    const elapsedMs = completedAt - startedAt;
    return {
      responseClass,
      startedAt,
      completedAt,
      elapsedMs,
      targetMet: elapsedMs <= budget.targetMs,
      deadlineMet: elapsedMs <= budget.hardDeadlineMs
    };
  }

  assertNoRemoteDependency(responseClass: ResponseClass, requiresRemote: boolean): void {
    if (requiresRemote && !this.budget(responseClass).remoteDependencyAllowed) {
      throw new Error(`${responseClass} response cannot depend on remote connectivity`);
    }
  }
}
