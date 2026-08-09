export type InvariantViolation = {
  id: string;
  message: string;
  severity: "warning" | "stop" | "emergency";
};

export type Invariant = {
  id: string;
  description: string;
  evaluate(state: Record<string, unknown>): boolean;
  severity: InvariantViolation["severity"];
};

export class InvariantEngine {
  constructor(private readonly invariants: Invariant[]) {}

  evaluate(state: Record<string, unknown>): InvariantViolation[] {
    const violations: InvariantViolation[] = [];
    for (const invariant of this.invariants) {
      if (!invariant.evaluate(state)) {
        violations.push({ id: invariant.id, message: invariant.description, severity: invariant.severity });
      }
    }
    return violations;
  }

  assertSafe(state: Record<string, unknown>): void {
    const violations = this.evaluate(state).filter((v) => v.severity !== "warning");
    if (violations.length > 0) {
      throw new Error(`Invariant violation: ${violations.map((v) => v.id).join(", ")}`);
    }
  }
}
