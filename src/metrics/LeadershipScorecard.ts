export type LeadershipSnapshot = {
  realRobotEmbodiments: number;
  unrelatedManufacturers: number;
  productionUseCases: number;
  medianTimeToQualifiedWorkMs: number;
  autonomousRecoveryRate: number;
  recurrencePreventionRate: number;
  brainRewriteRate: number;
  softwareOnlyDeploymentRate: number;
  qualifiedFleetUnits: number;
  oemPrograms: number;
};

export type LeadershipTarget = Partial<LeadershipSnapshot>;

export type LeadershipGap = {
  metric: keyof LeadershipSnapshot;
  current: number;
  target: number;
  direction: "at-least" | "at-most";
  satisfied: boolean;
};

/**
 * Measures whether ECA-1 is actually becoming robotics infrastructure rather
 * than merely accumulating features. Universality is demonstrated by unrelated
 * real embodiments with a low brain-rewrite rate; ease of adoption by TQW;
 * dependability by recovery; scalability by software-only and OEM deployment.
 */
export class LeadershipScorecard {
  compare(current: LeadershipSnapshot, target: LeadershipTarget): LeadershipGap[] {
    const lowerIsBetter = new Set<keyof LeadershipSnapshot>([
      "medianTimeToQualifiedWorkMs",
      "brainRewriteRate"
    ]);

    return (Object.entries(target) as [keyof LeadershipSnapshot, number | undefined][])
      .filter((entry): entry is [keyof LeadershipSnapshot, number] => entry[1] !== undefined)
      .map(([metric, desired]) => {
        const value = current[metric];
        const direction = lowerIsBetter.has(metric) ? "at-most" : "at-least";
        return {
          metric,
          current: value,
          target: desired,
          direction,
          satisfied: direction === "at-most" ? value <= desired : value >= desired
        };
      });
  }

  allSatisfied(current: LeadershipSnapshot, target: LeadershipTarget): boolean {
    return this.compare(current, target).every((gap) => gap.satisfied);
  }
}
