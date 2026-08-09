export type CalibrationProbe = {
  id: string;
  target: string;
  informationGain: number;
  risk: number;
  energyCost: number;
  durationMs: number;
  prerequisites: string[];
};

export type CalibrationPlan = {
  selected: CalibrationProbe[];
  rejected: Array<{ id: string; reason: string }>;
};

export class AutomaticCalibrationPlanner {
  plan(
    probes: CalibrationProbe[],
    limits: { maxRisk: number; maxEnergy: number; maxDurationMs: number; availablePrerequisites: string[] }
  ): CalibrationPlan {
    const available = new Set(limits.availablePrerequisites);
    const rejected: Array<{ id: string; reason: string }> = [];
    let risk = 0;
    let energy = 0;
    let duration = 0;

    const ranked = [...probes].sort((a, b) => {
      const scoreA = a.informationGain / Math.max(1e-6, a.risk + a.energyCost + a.durationMs / 1000);
      const scoreB = b.informationGain / Math.max(1e-6, b.risk + b.energyCost + b.durationMs / 1000);
      return scoreB - scoreA;
    });

    const selected: CalibrationProbe[] = [];
    for (const probe of ranked) {
      if (!probe.prerequisites.every((item) => available.has(item))) {
        rejected.push({ id: probe.id, reason: "missing-prerequisite" });
        continue;
      }
      if (risk + probe.risk > limits.maxRisk) {
        rejected.push({ id: probe.id, reason: "risk-budget" });
        continue;
      }
      if (energy + probe.energyCost > limits.maxEnergy) {
        rejected.push({ id: probe.id, reason: "energy-budget" });
        continue;
      }
      if (duration + probe.durationMs > limits.maxDurationMs) {
        rejected.push({ id: probe.id, reason: "time-budget" });
        continue;
      }
      selected.push(probe);
      risk += probe.risk;
      energy += probe.energyCost;
      duration += probe.durationMs;
    }

    return { selected, rejected };
  }
}
