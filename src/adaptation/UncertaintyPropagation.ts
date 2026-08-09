export type UncertainValue<T> = {
  value: T;
  confidence: number;
  sources: string[];
  staleAfterMs?: number;
  updatedAt: number;
};

export type CombinedUncertainty = {
  confidence: number;
  stale: boolean;
  sourceCount: number;
};

export class UncertaintyPropagation {
  combine(values: Array<UncertainValue<unknown>>, now = Date.now()): CombinedUncertainty {
    if (values.length === 0) return { confidence: 0, stale: true, sourceCount: 0 };
    const stale = values.some((item) => item.staleAfterMs !== undefined && now - item.updatedAt > item.staleAfterMs);
    const confidence = values.reduce((product, item) => product * Math.max(0, Math.min(1, item.confidence)), 1);
    const sources = new Set(values.flatMap((item) => item.sources));
    return { confidence, stale, sourceCount: sources.size };
  }

  decisionBand(confidence: number): "validated" | "bounded" | "uncertain" | "unknown" {
    if (confidence >= 0.9) return "validated";
    if (confidence >= 0.7) return "bounded";
    if (confidence >= 0.4) return "uncertain";
    return "unknown";
  }
}
