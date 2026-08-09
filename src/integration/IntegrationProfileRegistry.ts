import type { PhysicalRobotDescriptor } from "../hardware/UniversalPhysicalRobotContract.js";

export type IntegrationProfile = {
  id: string;
  match: {
    manufacturer?: string;
    model?: string;
    firmwarePrefix?: string;
    protocols?: string[];
    transports?: string[];
  };
  validatedCapabilities: string[];
  safetyEndpoints: string[];
  calibrationKeys: string[];
  evidenceIds: string[];
  validUntil?: number;
};

export class IntegrationProfileRegistry {
  private readonly profiles = new Map<string, IntegrationProfile>();

  put(profile: IntegrationProfile): void {
    this.profiles.set(profile.id, structuredClone(profile));
  }

  find(descriptor: PhysicalRobotDescriptor, now = Date.now()): IntegrationProfile | undefined {
    const protocols = new Set(descriptor.endpoints.map((endpoint) => endpoint.protocol).filter(Boolean) as string[]);
    const transports = new Set(descriptor.endpoints.map((endpoint) => endpoint.transport));

    const candidates = [...this.profiles.values()].filter((profile) => {
      if (profile.validUntil !== undefined && profile.validUntil < now) return false;
      if (profile.match.manufacturer && profile.match.manufacturer !== descriptor.manufacturer) return false;
      if (profile.match.model && profile.match.model !== descriptor.model) return false;
      if (profile.match.firmwarePrefix && !descriptor.firmware?.startsWith(profile.match.firmwarePrefix)) return false;
      if (profile.match.protocols?.some((protocol) => !protocols.has(protocol))) return false;
      if (profile.match.transports?.some((transport) => !transports.has(transport))) return false;
      return true;
    });

    return candidates.sort((a, b) => this.specificity(b) - this.specificity(a))[0];
  }

  list(): IntegrationProfile[] {
    return [...this.profiles.values()].map((profile) => structuredClone(profile));
  }

  private specificity(profile: IntegrationProfile): number {
    return Number(Boolean(profile.match.manufacturer)) + Number(Boolean(profile.match.model)) * 2 + Number(Boolean(profile.match.firmwarePrefix)) * 2 + (profile.match.protocols?.length ?? 0) + (profile.match.transports?.length ?? 0);
  }
}
