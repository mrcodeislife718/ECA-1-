export type LatencySample = {
  label: string;
  startedAt: number;
  endedAt: number;
  durationMs: number;
  deadlineMs?: number;
  metDeadline?: boolean;
};

export type LatencySummary = {
  count: number;
  minMs: number;
  maxMs: number;
  meanMs: number;
  p95Ms: number;
  deadlineMisses: number;
};

export class LatencyProfiler {
  private readonly samplesValue: LatencySample[] = [];

  async measure<T>(label: string, operation: () => Promise<T> | T, deadlineMs?: number): Promise<T> {
    const startedAt = performance.now();
    const value = await operation();
    const endedAt = performance.now();
    const durationMs = endedAt - startedAt;
    this.samplesValue.push({
      label,
      startedAt,
      endedAt,
      durationMs,
      deadlineMs,
      metDeadline: deadlineMs === undefined ? undefined : durationMs <= deadlineMs
    });
    return value;
  }

  samples(label?: string): LatencySample[] {
    return this.samplesValue.filter((sample) => label === undefined || sample.label === label).map((sample) => ({ ...sample }));
  }

  summary(label?: string): LatencySummary {
    const samples = this.samples(label);
    if (samples.length === 0) return { count: 0, minMs: 0, maxMs: 0, meanMs: 0, p95Ms: 0, deadlineMisses: 0 };
    const durations = samples.map((sample) => sample.durationMs).sort((a, b) => a - b);
    const p95Index = Math.min(durations.length - 1, Math.ceil(durations.length * 0.95) - 1);
    return {
      count: durations.length,
      minMs: durations[0] ?? 0,
      maxMs: durations[durations.length - 1] ?? 0,
      meanMs: durations.reduce((sum, value) => sum + value, 0) / durations.length,
      p95Ms: durations[p95Index] ?? 0,
      deadlineMisses: samples.filter((sample) => sample.metDeadline === false).length
    };
  }

  clear(): void { this.samplesValue.length = 0; }
}
