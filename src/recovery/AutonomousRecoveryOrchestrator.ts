import type { CandidateAction, Discrepancy } from "../contracts.js";
import { CausalHypothesisManager, type CausalHypothesis } from "../cognition/CausalHypothesisManager.js";
import { DiagnosticPlanner, type DiagnosticCandidate, type DiagnosticPlan } from "./DiagnosticPlanner.js";
import { RecoveryBudget } from "./RecoveryBudget.js";
import { RecoveryStateMachine, type RecoveryState } from "./RecoveryStateMachine.js";
import { EightNodeObstructionFramework, type EightNodeAnalysis, type ObstructionAssessment } from "../cognition/EightNodeObstructionFramework.js";

export type RecoveryObservation = {
  evidenceId: string;
  supports: string[];
  contradicts: string[];
  resolved: boolean;
  stable: boolean;
  notes?: string[];
};

export type RecoveryExecutionResult = {
  plan?: DiagnosticPlan;
  action?: CandidateAction;
  observation?: RecoveryObservation;
  state: RecoveryState;
  obstruction?: ObstructionAssessment;
};

export type RecoveryCallbacks = {
  executeDiagnostic(candidate: DiagnosticCandidate): Promise<RecoveryObservation>;
};

export class AutonomousRecoveryOrchestrator {
  readonly hypotheses = new CausalHypothesisManager();
  readonly stateMachine: RecoveryStateMachine;
  readonly obstructionFramework = new EightNodeObstructionFramework();

  constructor(
    private readonly planner: DiagnosticPlanner,
    private readonly budget: RecoveryBudget,
    callbacks: RecoveryCallbacks,
    maxAttempts = 3
  ) {
    this.callbacks = callbacks;
    this.stateMachine = new RecoveryStateMachine(maxAttempts);
  }

  private readonly callbacks: RecoveryCallbacks;

  seedHypotheses(hypotheses: CausalHypothesis[]): void {
    this.hypotheses.clear();
    for (const hypothesis of hypotheses) this.hypotheses.propose(hypothesis);
  }

  async recover(
    discrepancy: Discrepancy,
    candidates: DiagnosticCandidate[],
    limits: { maxRisk: number; maxCost: number },
    eightNodeAnalysis?: EightNodeAnalysis
  ): Promise<RecoveryExecutionResult> {
    if (this.stateMachine.state() === "normal") this.stateMachine.transition("observe");
    if (this.stateMachine.state() === "observe") this.stateMachine.transition("diagnose");

    const obstruction = eightNodeAnalysis
      ? this.obstructionFramework.analyze(
          { id: discrepancy.id, description: "physical-recovery-obstruction" },
          eightNodeAnalysis,
          discrepancy.hazard === "critical" ? "critical" : discrepancy.hazard === "high" ? "high" : "medium"
        )
      : undefined;

    if (discrepancy.hazard === "critical") {
      this.stateMachine.transition("safe-state");
      return { state: this.stateMachine.state(), obstruction };
    }

    this.stateMachine.transition("propose");
    const plan = this.planner.select(discrepancy, this.hypotheses.ranked(), candidates, limits);
    if (!plan.selected) {
      this.stateMachine.transition("diagnose");
      return { plan, state: this.stateMachine.state(), obstruction };
    }

    const budgetDecision = this.budget.canAttempt(plan.selected.estimatedRisk, plan.selected.estimatedCost);
    if (!budgetDecision.allowed) {
      this.stateMachine.transition("authorize");
      this.stateMachine.transition("safe-state");
      return { plan, state: this.stateMachine.state(), obstruction };
    }

    this.stateMachine.transition("authorize");
    this.budget.consume(plan.selected.estimatedRisk, plan.selected.estimatedCost);
    this.stateMachine.transition("test");

    const observation = await this.callbacks.executeDiagnostic(plan.selected);
    this.stateMachine.transition("verify");

    for (const id of observation.supports) {
      if (this.hypotheses.ranked().some((h) => h.id === id)) this.hypotheses.update(id, observation.evidenceId, true);
    }
    for (const id of observation.contradicts) {
      if (this.hypotheses.ranked().some((h) => h.id === id)) this.hypotheses.update(id, observation.evidenceId, false);
    }

    if (observation.resolved && observation.stable) {
      this.stateMachine.transition("resume");
    } else if (!observation.stable) {
      this.stateMachine.transition("degraded");
    } else {
      this.stateMachine.transition("diagnose");
    }

    return {
      plan,
      action: plan.selected.action,
      observation,
      state: this.stateMachine.state(),
      obstruction
    };
  }
}
