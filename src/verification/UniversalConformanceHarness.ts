import type { PlatformAdapter } from "../contracts.js";
import { EmbodimentHandshake } from "../integration/EmbodimentHandshake.js";

export type ConformanceResult = {
  platformId: string;
  passed: boolean;
  failures: string[];
  capabilities: string[];
};

export class UniversalConformanceHarness {
  private readonly handshake = new EmbodimentHandshake();

  async verify(platform: PlatformAdapter): Promise<ConformanceResult> {
    const failures: string[] = [];
    const profile = await this.handshake.profile(platform);
    if (!profile.capabilities.length) failures.push("no-capabilities");

    const [observations, state] = await Promise.all([platform.sense(), platform.snapshot()]);
    if (!observations.length) failures.push("no-sensor-observations");
    if (!Number.isFinite(state.timestamp)) failures.push("invalid-state-timestamp");

    for (const capability of profile.capabilities) {
      if (!capability.id) failures.push("capability-id-missing");
      if (!Number.isFinite(capability.maxLatencyMs) || capability.maxLatencyMs < 0) failures.push(`invalid-latency:${capability.id}`);
    }

    return {
      platformId: platform.id,
      passed: failures.length === 0,
      failures,
      capabilities: profile.capabilityIds
    };
  }

  async verifyMany(platforms: PlatformAdapter[]): Promise<ConformanceResult[]> {
    return Promise.all(platforms.map((platform) => this.verify(platform)));
  }
}
