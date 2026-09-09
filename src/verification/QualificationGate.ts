export type QualificationCheck = {
  id: string;
  category: string;
  required: boolean;
  passed: boolean;
  evidence?: string[];
  measuredAt: number;
};

export type QualificationDecision = {
  qualified: boolean;
  failedRequiredChecks: string[];
  missingCategories: string[];
};

export class QualificationGate {
  private readonly checks = new Map<string, QualificationCheck>();

  constructor(private readonly requiredCategories: string[] = []) {}

  record(check: QualificationCheck): void {
    this.checks.set(check.id, {
      ...check,
      ...(check.evidence ? { evidence: [...check.evidence] } : {})
    });
  }

  evaluate(): QualificationDecision {
    const all = [...this.checks.values()];
    const failedRequiredChecks = all
      .filter((check) => check.required && !check.passed)
      .map((check) => check.id)
      .sort();

    const passedCategories = new Set(
      all.filter((check) => check.passed).map((check) => check.category)
    );
    const missingCategories = this.requiredCategories
      .filter((category) => !passedCategories.has(category))
      .sort();

    return {
      qualified: failedRequiredChecks.length === 0 && missingCategories.length === 0,
      failedRequiredChecks,
      missingCategories
    };
  }

  assertQualified(): void {
    const decision = this.evaluate();
    if (!decision.qualified) {
      throw new Error(
        `Qualification blocked: failed=${decision.failedRequiredChecks.join(",") || "none"}; missing=${decision.missingCategories.join(",") || "none"}`
      );
    }
  }

  history(): QualificationCheck[] {
    return [...this.checks.values()].map((check) => ({
      ...check,
      ...(check.evidence ? { evidence: [...check.evidence] } : {})
    }));
  }
}
