export type DegradationSignal = { component: string; kind: string; severity: number; confidence: number; timestamp: number; source: string };
export type DegradationState = { component: string; accumulated: number; trend: number; status: "nominal" | "watch" | "degraded" | "critical"; updatedAt: number };

export class DamageDegradationAccumulator {
  private readonly history = new Map<string, DegradationSignal[]>();

  ingest(signal: DegradationSignal): DegradationState {
    const list = this.history.get(signal.component) ?? [];
    list.push({ ...signal, severity: Math.max(0, signal.severity), confidence: Math.max(0, Math.min(1, signal.confidence)) });
    this.history.set(signal.component, list.slice(-1000));
    return this.state(signal.component);
  }

  state(component: string): DegradationState {
    const list = this.history.get(component) ?? [];
    const weighted = list.reduce((sum, item) => sum + item.severity * item.confidence, 0);
    const recent = list.slice(-10);
    const older = list.slice(-20, -10);
    const recentAvg = recent.length ? recent.reduce((sum, item) => sum + item.severity * item.confidence, 0) / recent.length : 0;
    const olderAvg = older.length ? older.reduce((sum, item) => sum + item.severity * item.confidence, 0) / older.length : 0;
    const trend = recentAvg - olderAvg;
    const status = weighted >= 10 ? "critical" : weighted >= 5 ? "degraded" : weighted >= 2 ? "watch" : "nominal";
    return { component, accumulated: weighted, trend, status, updatedAt: list.at(-1)?.timestamp ?? 0 };
  }

  all(): DegradationState[] { return [...this.history.keys()].map((component) => this.state(component)); }
}
