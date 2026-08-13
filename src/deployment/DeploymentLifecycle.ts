export type DeploymentStage =
  | "code"
  | "simulation"
  | "real-robot"
  | "multi-real-robot"
  | "autonomous-recovery"
  | "measurable-improvement"
  | "paying-deployment"
  | "repeatable-deployment"
  | "oem-integration"
  | "standard";

export type DeploymentEvidence = {
  id: string;
  stage: DeploymentStage;
  passed: boolean;
  timestamp: number;
  source: string;
  metrics?: Record<string, number>;
  notes?: string[];
};

const ORDER: DeploymentStage[] = [
  "code",
  "simulation",
  "real-robot",
  "multi-real-robot",
  "autonomous-recovery",
  "measurable-improvement",
  "paying-deployment",
  "repeatable-deployment",
  "oem-integration",
  "standard"
];

export class DeploymentLifecycle {
  private readonly evidence: DeploymentEvidence[] = [];

  record(item: DeploymentEvidence): void {
    this.evidence.push({
      ...item,
      ...(item.metrics ? { metrics: { ...item.metrics } } : {}),
      ...(item.notes ? { notes: [...item.notes] } : {})
    });
  }

  highestProvenStage(): DeploymentStage | undefined {
    let highest: DeploymentStage | undefined;
    for (const stage of ORDER) {
      const passed = this.evidence.some((item) => item.stage === stage && item.passed);
      if (!passed) break;
      highest = stage;
    }
    return highest;
  }

  nextRequiredStage(): DeploymentStage | undefined {
    const highest = this.highestProvenStage();
    if (!highest) return ORDER[0];
    const index = ORDER.indexOf(highest);
    return ORDER[index + 1];
  }

  gaps(): DeploymentStage[] {
    return ORDER.filter((stage) => !this.evidence.some((item) => item.stage === stage && item.passed));
  }

  history(): DeploymentEvidence[] {
    return this.evidence.map((item) => ({
      ...item,
      ...(item.metrics ? { metrics: { ...item.metrics } } : {}),
      ...(item.notes ? { notes: [...item.notes] } : {})
    }));
  }
}
