import type { Capability, PlatformAdapter } from "../contracts.js";

export type EmbodimentProfile = {
  platformId: string;
  capabilities: Capability[];
  capabilityIds: string[];
  requiresUplink: string[];
  maxDeclaredLatencyMs: number;
  ready: boolean;
  blockers: string[];
  createdAt: number;
};

export type EmbodimentRequirement = {
  capability: string;
  required: boolean;
  maxLatencyMs?: number;
};

/**
 * Converts any robot adapter into an explicit capability profile before ECA-1
 * attempts mission execution. The cognitive core reasons over capabilities,
 * never vendor identity.
 */
export class EmbodimentHandshake {
  async profile(platform: PlatformAdapter, requirements: EmbodimentRequirement[] = []): Promise<EmbodimentProfile> {
    const capabilities = await platform.capabilities();
    const capabilityIds = capabilities.map((c) => c.id);
    const blockers: string[] = [];

    for (const requirement of requirements) {
      const capability = capabilities.find((c) => c.id === requirement.capability);
      if (!capability && requirement.required) blockers.push(`missing:${requirement.capability}`);
      if (capability && requirement.maxLatencyMs !== undefined && capability.maxLatencyMs > requirement.maxLatencyMs) {
        blockers.push(`latency:${requirement.capability}:${capability.maxLatencyMs}>${requirement.maxLatencyMs}`);
      }
    }

    return {
      platformId: platform.id,
      capabilities,
      capabilityIds,
      requiresUplink: capabilities.filter((c) => c.requiresUplink).map((c) => c.id),
      maxDeclaredLatencyMs: capabilities.reduce((max, c) => Math.max(max, c.maxLatencyMs), 0),
      ready: blockers.length === 0,
      blockers,
      createdAt: Date.now()
    };
  }

  sharedCapabilities(a: EmbodimentProfile, b: EmbodimentProfile): string[] {
    const right = new Set(b.capabilityIds);
    return a.capabilityIds.filter((id) => right.has(id));
  }
}
