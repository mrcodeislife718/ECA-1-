export interface StateObservation<T = unknown> {
  key: string;
  value: T;
  source: string;
  confidence: number;
  observedAt: number;
}

export interface BeliefStateEntry<T = unknown> {
  value: T;
  confidence: number;
  source: string;
  observedAt: number;
  alternatives: Array<{ value: T; confidence: number; source: string; observedAt: number }>;
}

export class WorldStateModel {
  private readonly observations = new Map<string, StateObservation[]>();

  observe<T>(observation: StateObservation<T>): void {
    if (!observation.key.trim() || !observation.source.trim()) throw new Error('observation key and source are required');
    if (observation.confidence < 0 || observation.confidence > 1) throw new Error('confidence must be between 0 and 1');
    const existing = this.observations.get(observation.key) ?? [];
    existing.push(structuredClone(observation));
    this.observations.set(observation.key, existing);
  }

  belief<T = unknown>(key: string): BeliefStateEntry<T> | null {
    const values = this.observations.get(key) ?? [];
    if (values.length === 0) return null;
    const ranked = [...values].sort((a, b) => b.confidence - a.confidence || b.observedAt - a.observedAt || a.source.localeCompare(b.source));
    const [selected, ...alternatives] = ranked;
    return {
      value: structuredClone(selected.value) as T,
      confidence: selected.confidence,
      source: selected.source,
      observedAt: selected.observedAt,
      alternatives: alternatives.map((item) => ({ value: structuredClone(item.value) as T, confidence: item.confidence, source: item.source, observedAt: item.observedAt })),
    };
  }

  snapshot(): Record<string, BeliefStateEntry> {
    const result: Record<string, BeliefStateEntry> = {};
    for (const key of this.observations.keys()) {
      const belief = this.belief(key);
      if (belief) result[key] = belief;
    }
    return result;
  }

  predict(action: { type: string; payload?: Record<string, unknown> }, transition: (state: Record<string, BeliefStateEntry>, action: { type: string; payload?: Record<string, unknown> }) => Record<string, BeliefStateEntry>) {
    return transition(structuredClone(this.snapshot()), structuredClone(action));
  }

  reconcile(predicted: Record<string, BeliefStateEntry>, observedKeys?: string[]) {
    const actual = this.snapshot();
    const keys = observedKeys ?? [...new Set([...Object.keys(predicted), ...Object.keys(actual)])];
    const mismatches = keys.flatMap((key) => {
      const expected = predicted[key]?.value;
      const observed = actual[key]?.value;
      return JSON.stringify(expected) === JSON.stringify(observed) ? [] : [{ key, expected: structuredClone(expected), observed: structuredClone(observed), confidence: actual[key]?.confidence ?? 0 }];
    });
    return {
      matched: mismatches.length === 0,
      mismatches,
      uncertainty: keys.length ? keys.reduce((sum, key) => sum + (1 - (actual[key]?.confidence ?? 0)), 0) / keys.length : 0,
    };
  }
}
