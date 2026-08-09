export type QualificationStatus = "qualified" | "degraded" | "expired" | "revoked" | "unqualified";

export type QualificationEnvelope = {
  capability: string;
  platformId: string;
  evidenceIds: string[];
  confidence: number;
  maxLatencyMs?: number;
  maxForce?: number;
  maxEnergy?: number;
  environmentTags?: string[];
  validFrom: number;
  validUntil: number;
  status: QualificationStatus;
};

export class CapabilityQualificationLedger {
  private readonly entries = new Map<string, QualificationEnvelope>();

  put(entry: QualificationEnvelope): void {
    this.entries.set(this.key(entry.platformId, entry.capability), { ...entry, evidenceIds: [...entry.evidenceIds] });
  }

  get(platformId: string, capability: string): QualificationEnvelope | undefined {
    const entry = this.entries.get(this.key(platformId, capability));
    return entry ? { ...entry, evidenceIds: [...entry.evidenceIds] } : undefined;
  }

  validate(platformId: string, capability: string, now = Date.now()): { valid: boolean; reasons: string[] } {
    const entry = this.entries.get(this.key(platformId, capability));
    const reasons: string[] = [];
    if (!entry) reasons.push("qualification-missing");
    else {
      if (entry.status !== "qualified") reasons.push(`qualification-${entry.status}`);
      if (now < entry.validFrom) reasons.push("qualification-not-yet-valid");
      if (now > entry.validUntil) reasons.push("qualification-expired");
      if (entry.confidence < 0.8) reasons.push("qualification-confidence-low");
      if (entry.evidenceIds.length === 0) reasons.push("qualification-evidence-missing");
    }
    return { valid: reasons.length === 0, reasons };
  }

  invalidate(platformId: string, capability: string, status: Exclude<QualificationStatus, "qualified"> = "revoked"): void {
    const key = this.key(platformId, capability);
    const entry = this.entries.get(key);
    if (entry) this.entries.set(key, { ...entry, status });
  }

  list(platformId?: string): QualificationEnvelope[] {
    return [...this.entries.values()]
      .filter((entry) => platformId === undefined || entry.platformId === platformId)
      .map((entry) => ({ ...entry, evidenceIds: [...entry.evidenceIds] }));
  }

  private key(platformId: string, capability: string): string { return `${platformId}::${capability}`; }
}
