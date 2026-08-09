import type { SensorObservation } from "../contracts.js";

export type FusedObservation = {
  kind: string;
  value: unknown;
  confidence: number;
  sources: string[];
  contradictory: boolean;
  freshestAt: number;
};

export class SensorFusionConfidence {
  fuse(observations: SensorObservation[]): FusedObservation[] {
    const groups = new Map<string, SensorObservation[]>();
    for (const observation of observations) {
      const list = groups.get(observation.kind) ?? [];
      list.push(observation);
      groups.set(observation.kind, list);
    }

    return [...groups.entries()].map(([kind, items]) => {
      const usable = items.filter((item) => item.health !== "failed");
      const ranked = [...usable].sort((a, b) => this.score(b) - this.score(a));
      const selected = ranked[0] ?? items[0];
      const signatures = new Set(usable.map((item) => JSON.stringify(item.data)));
      const confidence = usable.length === 0
        ? 0
        : Math.max(0, Math.min(1, usable.reduce((sum, item) => sum + this.score(item), 0) / usable.length));

      return {
        kind,
        value: selected?.data,
        confidence,
        sources: usable.map((item) => item.source),
        contradictory: signatures.size > 1,
        freshestAt: Math.max(...items.map((item) => item.timestamp))
      };
    });
  }

  private score(observation: SensorObservation): number {
    const healthFactor = observation.health === "nominal" ? 1 : observation.health === "degraded" ? 0.6 : observation.health === "unknown" ? 0.4 : 0;
    return observation.confidence * healthFactor;
  }
}
