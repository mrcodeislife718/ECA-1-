import type { PlatformAdapter } from "../contracts.js";
import { AutomaticEmbodimentAdaptation } from "../integration/AutomaticEmbodimentAdaptation.js";
import { CapabilityQualificationLedger } from "./CapabilityQualificationLedger.js";
import { StateTrustGuard, type StateFact } from "./StateTrustGuard.js";
import { TransitionTransaction, type TransitionSnapshot } from "./TransitionTransaction.js";
import { UniversalConformanceHarness } from "../verification/UniversalConformanceHarness.js";

export type MissionRequirement = { capability: string; required: boolean };

export type RuntimeReadiness = {
  platformId: string;
  ready: boolean;
  reasons: string[];
};

export class UniversalEmbodimentRuntime {
  readonly qualifications = new CapabilityQualificationLedger();
  readonly stateTrust = new StateTrustGuard();
  readonly transitions = new TransitionTransaction();
  readonly conformance = new UniversalConformanceHarness();
  readonly adaptation = new AutomaticEmbodimentAdaptation();

  async assess(platform: PlatformAdapter, requirements: MissionRequirement[], facts: StateFact[], now = Date.now()): Promise<RuntimeReadiness> {
    const reasons: string[] = [];
    const conformance = await this.conformance.verify(platform);
    if (!conformance.passed) reasons.push(...conformance.failures.map((reason) => `conformance:${reason}`));

    const trust = this.stateTrust.evaluate(facts, { maxAgeMs: 250, minConfidence: 0.8 }, now);
    if (!trust.trusted) reasons.push(...trust.reasons.map((reason) => `state:${reason}`));

    for (const requirement of requirements.filter((item) => item.required)) {
      const result = this.qualifications.validate(platform.id, requirement.capability, now);
      if (!result.valid) reasons.push(...result.reasons.map((reason) => `capability:${requirement.capability}:${reason}`));
    }

    return { platformId: platform.id, ready: reasons.length === 0, reasons };
  }

  prepareTransition(source: TransitionSnapshot, target: TransitionSnapshot): void {
    this.transitions.prepare(source, target);
  }

  commitTransition(readiness: RuntimeReadiness): TransitionSnapshot {
    return this.transitions.commit(() => readiness.ready ? [] : readiness.reasons);
  }

  rollbackTransition(): TransitionSnapshot { return this.transitions.rollback(); }
}
