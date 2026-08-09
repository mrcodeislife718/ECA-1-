export type AssumptionStatus = "unverified" | "supported" | "falsified" | "expired";

export type Assumption = {
  id: string;
  statement: string;
  status: AssumptionStatus;
  evidenceIds: string[];
  confidence: number;
  createdAt: number;
  expiresAt?: number;
};

export class AssumptionLedger {
  private readonly assumptions = new Map<string, Assumption>();

  add(assumption: Assumption): void {
    if (this.assumptions.has(assumption.id)) throw new Error(`Duplicate assumption ${assumption.id}`);
    this.assumptions.set(assumption.id, assumption);
  }

  mark(id: string, status: AssumptionStatus, evidenceId?: string, confidence?: number): Assumption {
    const current = this.assumptions.get(id);
    if (!current) throw new Error(`Unknown assumption ${id}`);
    const next: Assumption = {
      ...current,
      status,
      evidenceIds: evidenceId ? [...current.evidenceIds, evidenceId] : current.evidenceIds,
      confidence: confidence === undefined ? current.confidence : Math.max(0, Math.min(1, confidence))
    };
    this.assumptions.set(id, next);
    return next;
  }

  unresolved(now = Date.now()): Assumption[] {
    return [...this.assumptions.values()].filter((item) => {
      if (item.expiresAt !== undefined && item.expiresAt < now) return true;
      return item.status === "unverified" || item.status === "expired";
    });
  }

  refreshExpiry(now = Date.now()): void {
    for (const [id, item] of this.assumptions) {
      if (item.expiresAt !== undefined && item.expiresAt < now && item.status !== "falsified") {
        this.assumptions.set(id, { ...item, status: "expired" });
      }
    }
  }
}
