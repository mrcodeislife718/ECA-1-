export type EdgeDimension =
  | "sensor"
  | "actuator"
  | "timing"
  | "network"
  | "power"
  | "environment"
  | "human"
  | "authority"
  | "state"
  | "memory"
  | "learning"
  | "integration"
  | "security"
  | "recovery";

export type EdgeCase = {
  id: string;
  dimensions: EdgeDimension[];
  description: string;
  tested: boolean;
  passed?: boolean;
};

export class EdgeCaseMatrix {
  constructor(private readonly cases: EdgeCase[] = []) {}

  add(edgeCase: EdgeCase): void {
    if (this.cases.some((item) => item.id === edgeCase.id)) throw new Error(`Duplicate edge case ${edgeCase.id}`);
    this.cases.push(edgeCase);
  }

  coverage(): Record<EdgeDimension, { total: number; tested: number; passed: number }> {
    const dimensions: EdgeDimension[] = [
      "sensor", "actuator", "timing", "network", "power", "environment", "human",
      "authority", "state", "memory", "learning", "integration", "security", "recovery"
    ];
    return Object.fromEntries(dimensions.map((dimension) => {
      const relevant = this.cases.filter((item) => item.dimensions.includes(dimension));
      return [dimension, {
        total: relevant.length,
        tested: relevant.filter((item) => item.tested).length,
        passed: relevant.filter((item) => item.tested && item.passed).length
      }];
    })) as Record<EdgeDimension, { total: number; tested: number; passed: number }>;
  }

  gaps(): EdgeDimension[] {
    const coverage = this.coverage();
    return (Object.keys(coverage) as EdgeDimension[]).filter((dimension) => coverage[dimension].total === 0 || coverage[dimension].tested < coverage[dimension].total);
  }
}
