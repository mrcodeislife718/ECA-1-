import type { Capability, PlatformAdapter } from "../contracts.js";

export class UniversalPlatformRegistry {
  #platforms = new Map<string, PlatformAdapter>();

  register(adapter: PlatformAdapter): void {
    if (this.#platforms.has(adapter.id)) {
      throw new Error(`Platform already registered: ${adapter.id}`);
    }
    this.#platforms.set(adapter.id, adapter);
  }

  get(id: string): PlatformAdapter {
    const adapter = this.#platforms.get(id);
    if (!adapter) throw new Error(`Unknown platform: ${id}`);
    return adapter;
  }

  list(): PlatformAdapter[] {
    return [...this.#platforms.values()];
  }

  async capabilityIndex(): Promise<Map<string, { platformId: string; capability: Capability }[]>> {
    const index = new Map<string, { platformId: string; capability: Capability }[]>();
    for (const adapter of this.#platforms.values()) {
      for (const capability of await adapter.capabilities()) {
        const bucket = index.get(capability.id) ?? [];
        bucket.push({ platformId: adapter.id, capability });
        index.set(capability.id, bucket);
      }
    }
    return index;
  }
}
