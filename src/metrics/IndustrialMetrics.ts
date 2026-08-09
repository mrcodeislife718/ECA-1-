export type RecoverySample = {
  anomalyAt: number;
  recoveredAt?: number;
  humanIntervention: boolean;
  repeatedFailure: boolean;
  preventedOrResolvedEarly: boolean;
};

export class IndustrialMetrics {
  static meanTimeToAutonomousRecovery(samples: RecoverySample[]): number | null {
    const values = samples
      .filter((sample) => !sample.humanIntervention && sample.recoveredAt !== undefined)
      .map((sample) => (sample.recoveredAt as number) - sample.anomalyAt);
    if (values.length === 0) return null;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  static autonomousRecoveryRate(samples: RecoverySample[]): number {
    if (samples.length === 0) return 0;
    const recovered = samples.filter(
      (sample) => !sample.humanIntervention && sample.recoveredAt !== undefined
    ).length;
    return recovered / samples.length;
  }

  static recurrencePreventionRate(samples: RecoverySample[]): number {
    const repeated = samples.filter((sample) => sample.repeatedFailure);
    if (repeated.length === 0) return 0;
    return repeated.filter((sample) => sample.preventedOrResolvedEarly).length / repeated.length;
  }
}
