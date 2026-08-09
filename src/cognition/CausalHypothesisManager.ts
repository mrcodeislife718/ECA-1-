export type CausalHypothesis = {
  id: string;
  explanation: string;
  confidence: number;
  evidenceFor: string[];
  evidenceAgainst: string[];
  status: "active" | "supported" | "rejected" | "unknown";
};

export class CausalHypothesisManager {
  private readonly hypotheses = new Map<string, CausalHypothesis>();

  propose(hypothesis: CausalHypothesis): void { this.hypotheses.set(hypothesis.id, hypothesis); }

  update(id: string, evidenceId: string, supports: boolean, weight = 0.1): CausalHypothesis {
    const current = this.hypotheses.get(id);
    if (!current) throw new Error(`Unknown hypothesis ${id}`);
    const confidence = Math.max(0, Math.min(1, current.confidence + (supports ? weight : -weight)));
    const next: CausalHypothesis = {
      ...current,
      confidence,
      evidenceFor: supports ? [...current.evidenceFor, evidenceId] : current.evidenceFor,
      evidenceAgainst: supports ? current.evidenceAgainst : [...current.evidenceAgainst, evidenceId],
      status: confidence >= 0.75 ? "supported" : confidence <= 0.2 ? "rejected" : "active"
    };
    this.hypotheses.set(id, next);
    return next;
  }

  ranked(): CausalHypothesis[] { return [...this.hypotheses.values()].sort((a, b) => b.confidence - a.confidence); }
  clear(): void { this.hypotheses.clear(); }
}
