export type StateFact = { key: string; value: unknown; timestamp: number; confidence: number; source: string; causalParentIds?: string[] };

export type TrustDecision = { trusted: boolean; reasons: string[]; staleKeys: string[]; contradictoryKeys: string[] };

export class StateTrustGuard {
  evaluate(facts: StateFact[], options: { maxAgeMs: number; minConfidence: number }, now = Date.now()): TrustDecision {
    const reasons: string[] = [];
    const staleKeys = new Set<string>();
    const contradictoryKeys = new Set<string>();
    const byKey = new Map<string, StateFact[]>();

    for (const fact of facts) {
      const list = byKey.get(fact.key) ?? [];
      list.push(fact);
      byKey.set(fact.key, list);
      if (now - fact.timestamp > options.maxAgeMs) staleKeys.add(fact.key);
      if (fact.confidence < options.minConfidence) reasons.push(`low-confidence:${fact.key}`);
    }

    for (const [key, list] of byKey) {
      const live = list.filter((fact) => now - fact.timestamp <= options.maxAgeMs && fact.confidence >= options.minConfidence);
      if (live.length > 1) {
        const first = JSON.stringify(live[0].value);
        if (live.some((fact) => JSON.stringify(fact.value) !== first)) contradictoryKeys.add(key);
      }
    }

    for (const key of staleKeys) reasons.push(`stale:${key}`);
    for (const key of contradictoryKeys) reasons.push(`contradictory:${key}`);
    return { trusted: reasons.length === 0, reasons, staleKeys: [...staleKeys], contradictoryKeys: [...contradictoryKeys] };
  }
}
