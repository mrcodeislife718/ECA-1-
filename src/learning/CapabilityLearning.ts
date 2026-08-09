export type CapabilityLearningState = "raw" | "hypothesis" | "validated" | "promoted" | "demoted" | "rejected";

export type LearnedCapability = {
  id: string;
  state: CapabilityLearningState;
  evidence: string[];
  confidence: number;
  platformScope: string[];
  version: number;
};

export class CapabilityLearning {
  private readonly capabilities = new Map<string, LearnedCapability>();

  register(capability: LearnedCapability): void { this.capabilities.set(capability.id, capability); }
  get(id: string): LearnedCapability | undefined { return this.capabilities.get(id); }
  addEvidence(id: string, evidenceId: string, delta = 0.1): LearnedCapability {
    const current = this.capabilities.get(id);
    if (!current) throw new Error(`Unknown learned capability ${id}`);
    const next = { ...current, evidence: [...current.evidence, evidenceId], confidence: Math.max(0, Math.min(1, current.confidence + delta)), version: current.version + 1 };
    this.capabilities.set(id, next);
    return next;
  }
  promote(id: string): LearnedCapability {
    const current = this.getRequired(id);
    if (current.confidence < 0.8 || current.evidence.length < 2) throw new Error(`Capability ${id} lacks promotion evidence`);
    const next = { ...current, state: "promoted" as const, version: current.version + 1 };
    this.capabilities.set(id, next); return next;
  }
  demote(id: string): LearnedCapability {
    const current = this.getRequired(id); const next = { ...current, state: "demoted" as const, version: current.version + 1 };
    this.capabilities.set(id, next); return next;
  }
  private getRequired(id: string): LearnedCapability { const value = this.capabilities.get(id); if (!value) throw new Error(`Unknown learned capability ${id}`); return value; }
}
