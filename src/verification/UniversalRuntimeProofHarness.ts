import { UniversalEmbodimentRuntime, type MissionRequirement } from "../runtime/UniversalEmbodimentRuntime.js";
import { LatencyProfiler, type LatencySummary } from "../metrics/LatencyProfiler.js";
import type { PlatformAdapter } from "../contracts.js";
import type { StateFact } from "../runtime/StateTrustGuard.js";

export type ProofScenarioResult = {
  platformId: string;
  ready: boolean;
  reasons: string[];
  latency: LatencySummary;
};

export type CrossEmbodimentProof = {
  passed: boolean;
  results: ProofScenarioResult[];
  failures: string[];
};

export class UniversalRuntimeProofHarness {
  readonly runtime = new UniversalEmbodimentRuntime();
  readonly latency = new LatencyProfiler();

  qualify(platformId: string, capability: string, evidenceId: string, validForMs = 60_000, now = Date.now()): void {
    this.runtime.qualifications.put({
      platformId,
      capability,
      evidenceIds: [evidenceId],
      confidence: 0.99,
      validFrom: now,
      validUntil: now + validForMs,
      status: "qualified"
    });
  }

  freshFacts(platformId: string, now = Date.now()): StateFact[] {
    return [
      { key: "body", value: "known", source: platformId, confidence: 0.99, observedAt: now },
      { key: "world", value: "known", source: platformId, confidence: 0.99, observedAt: now },
      { key: "authority", value: "valid", source: "mission-authority", confidence: 1, observedAt: now }
    ];
  }

  async assessPlatform(
    platform: PlatformAdapter,
    requirements: MissionRequirement[],
    facts = this.freshFacts(platform.id),
    deadlineMs = 250
  ): Promise<ProofScenarioResult> {
    const readiness = await this.latency.measure(
      `assess:${platform.id}`,
      () => this.runtime.assess(platform, requirements, facts),
      deadlineMs
    );
    return {
      platformId: platform.id,
      ready: readiness.ready,
      reasons: readiness.reasons,
      latency: this.latency.summary(`assess:${platform.id}`)
    };
  }

  async proveCrossEmbodimentContinuity(
    platforms: PlatformAdapter[],
    requiredCapability = "move"
  ): Promise<CrossEmbodimentProof> {
    const requirements: MissionRequirement[] = [{ capability: requiredCapability, required: true }];
    const results: ProofScenarioResult[] = [];
    const failures: string[] = [];

    for (const platform of platforms) {
      this.qualify(platform.id, requiredCapability, `proof:${platform.id}:${requiredCapability}`);
      const result = await this.assessPlatform(platform, requirements);
      results.push(result);
      if (!result.ready) failures.push(`${platform.id}:${result.reasons.join("|")}`);
      if (result.latency.deadlineMisses > 0) failures.push(`${platform.id}:assessment-deadline-miss`);
    }

    return { passed: failures.length === 0, results, failures };
  }
}
