export type ExpectedValue = {
  key: string;
  value: unknown;
  tolerance?: number;
  confidence: number;
  source: string;
  expiresAt?: number;
};

export type ExpectationSet = {
  id: string;
  platformId: string;
  missionId?: string;
  createdAt: number;
  values: ExpectedValue[];
};

export type ExpectationResidual = {
  key: string;
  expected: unknown;
  observed: unknown;
  normalizedError: number;
  withinTolerance: boolean;
};

export class ExpectationModel {
  private readonly expectations = new Map<string, ExpectationSet>();

  set(expectation: ExpectationSet): void {
    this.expectations.set(expectation.id, expectation);
  }

  get(id: string): ExpectationSet | undefined {
    return this.expectations.get(id);
  }

  evaluate(id: string, observed: Record<string, unknown>, now = Date.now()): ExpectationResidual[] {
    const expectation = this.expectations.get(id);
    if (!expectation) throw new Error(`Unknown expectation ${id}`);

    return expectation.values
      .filter((item) => item.expiresAt === undefined || item.expiresAt >= now)
      .map((item) => {
        const actual = observed[item.key];
        if (typeof item.value === "number" && typeof actual === "number") {
          const tolerance = Math.max(0, item.tolerance ?? 0);
          const absoluteError = Math.abs(actual - item.value);
          const scale = Math.max(Math.abs(item.value), tolerance, 1e-9);
          return {
            key: item.key,
            expected: item.value,
            observed: actual,
            normalizedError: absoluteError / scale,
            withinTolerance: absoluteError <= tolerance
          };
        }

        return {
          key: item.key,
          expected: item.value,
          observed: actual,
          normalizedError: Object.is(item.value, actual) ? 0 : 1,
          withinTolerance: Object.is(item.value, actual)
        };
      });
  }

  meaningfulResiduals(id: string, observed: Record<string, unknown>, now = Date.now()): ExpectationResidual[] {
    return this.evaluate(id, observed, now).filter((residual) => !residual.withinTolerance);
  }

  remove(id: string): void {
    this.expectations.delete(id);
  }
}
