export type EightNodeAnalysis = {
  input: string[];
  process: string[];
  output: string[];
  feedback: string[];
  incentives: string[];
  bottlenecks: string[];
  dependencies: string[];
  failurePoints: string[];
};

export type ObstructionContext = {
  id: string;
  description: string;
  platformId?: string;
  missionId?: string;
  evidence?: string[];
  metadata?: Record<string, unknown>;
};

export type ObstructionAssessment = {
  obstructionId: string;
  framework: EightNodeAnalysis;
  blockingNodes: Array<keyof EightNodeAnalysis>;
  severity: "low" | "medium" | "high" | "critical";
  recommendedChecks: string[];
};

export class EightNodeObstructionFramework {
  analyze(
    obstruction: ObstructionContext,
    framework: EightNodeAnalysis,
    severity: ObstructionAssessment["severity"] = "medium"
  ): ObstructionAssessment {
    const blockingNodes = (Object.keys(framework) as Array<keyof EightNodeAnalysis>)
      .filter((key) => framework[key].length > 0);

    const recommendedChecks = blockingNodes.flatMap((node) => {
      switch (node) {
        case "input": return ["validate-input-quality", "check-input-freshness", "check-input-authority"];
        case "process": return ["trace-processing-path", "check-state-transition", "check-timing-budget"];
        case "output": return ["verify-output-against-expectation", "check-output-completeness"];
        case "feedback": return ["check-feedback-loop-closure", "check-feedback-delay", "check-feedback-trust"];
        case "incentives": return ["check-objective-conflict", "check-mission-priority", "check-cost-risk-pressure"];
        case "bottlenecks": return ["locate-capacity-limit", "check-compute-bandwidth", "check-serialization-or-locking"];
        case "dependencies": return ["verify-required-capability", "check-link-or-sensor-dependency", "check-fallback-availability"];
        case "failurePoints": return ["enumerate-failure-modes", "verify-detection", "verify-contained-fallback"];
      }
    });

    return {
      obstructionId: obstruction.id,
      framework,
      blockingNodes,
      severity,
      recommendedChecks: [...new Set(recommendedChecks)]
    };
  }
}
