export type TransitionPhase = "idle" | "prepared" | "committed" | "rolled-back";

export type TransitionSnapshot = {
  platformId: string;
  mission: Record<string, unknown>;
  world: Record<string, unknown>;
  authority: Record<string, unknown>;
  transferableLearning: Record<string, unknown>;
};

export class TransitionTransaction {
  private phaseValue: TransitionPhase = "idle";
  private source?: TransitionSnapshot;
  private target?: TransitionSnapshot;

  phase(): TransitionPhase { return this.phaseValue; }

  prepare(source: TransitionSnapshot, target: TransitionSnapshot): void {
    if (this.phaseValue !== "idle" && this.phaseValue !== "rolled-back") throw new Error(`Cannot prepare from ${this.phaseValue}`);
    this.source = structuredClone(source);
    this.target = structuredClone(target);
    this.phaseValue = "prepared";
  }

  commit(validate: (target: TransitionSnapshot) => string[]): TransitionSnapshot {
    if (this.phaseValue !== "prepared" || !this.target) throw new Error("Transition not prepared");
    const failures = validate(this.target);
    if (failures.length) throw new Error(`Transition validation failed: ${failures.join(", ")}`);
    this.phaseValue = "committed";
    return structuredClone(this.target);
  }

  rollback(): TransitionSnapshot {
    if (!this.source) throw new Error("No source snapshot available for rollback");
    this.phaseValue = "rolled-back";
    return structuredClone(this.source);
  }
}
