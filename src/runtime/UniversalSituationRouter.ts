import type { Discrepancy } from "../contracts.js";
import type { EnvironmentAssessment } from "../environment/EnvironmentEnvelope.js";
import { HumanResponsiveLatency, type ResponseClass } from "./HumanResponsiveLatency.js";

export type SituationDecision = {
  responseClass: ResponseClass;
  mode: "continue" | "slow" | "diagnose" | "degrade" | "stop";
  reasons: string[];
};

/**
 * Routes a situation into the fastest safe ECA-1 response path without making
 * the cognitive core embodiment-specific.
 */
export class UniversalSituationRouter {
  constructor(private readonly latency = new HumanResponsiveLatency()) {}

  decide(input: {
    urgency: number;
    discrepancy?: Discrepancy | null;
    environment: EnvironmentAssessment;
    stateStale?: boolean;
    authorityValid?: boolean;
  }): SituationDecision {
    const reasons: string[] = [];
    const hazard = input.discrepancy?.hazard ?? "none";
    const responseClass = this.latency.classify(input.urgency, hazard);

    if (input.authorityValid === false) {
      return { responseClass: "hardware-emergency", mode: "stop", reasons: ["authority-invalid"] };
    }
    if (input.stateStale) {
      reasons.push("state-stale");
      return { responseClass: "reflex", mode: "slow", reasons };
    }
    if (input.environment.status === "unsafe") {
      return { responseClass: "hardware-emergency", mode: "stop", reasons: input.environment.reasons };
    }
    if (input.environment.status === "contradictory") {
      return { responseClass: "sensorimotor", mode: "diagnose", reasons: input.environment.reasons };
    }
    if (input.environment.status === "novel") {
      return { responseClass: "deliberative", mode: "degrade", reasons: input.environment.reasons };
    }
    if (input.environment.status === "bounded-novel") reasons.push(...input.environment.reasons);
    if (input.discrepancy) {
      reasons.push(`discrepancy:${input.discrepancy.id}`);
      return { responseClass, mode: hazard === "high" ? "slow" : "diagnose", reasons };
    }
    return { responseClass, mode: "continue", reasons };
  }
}
