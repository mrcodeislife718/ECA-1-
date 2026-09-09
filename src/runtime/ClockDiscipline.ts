export type ClockSample = {
  sourceId: string;
  sourceTimestamp: number;
  referenceTimestamp: number;
  observedAt: number;
};

export type ClockStatus = {
  sourceId: string;
  offsetMs: number;
  jitterMs: number;
  samples: number;
  synchronized: boolean;
  updatedAt: number;
};

export type ClockDisciplineOptions = {
  maxOffsetMs: number;
  maxJitterMs: number;
  maxSamples?: number;
};

export class ClockDiscipline {
  private readonly samples = new Map<string, ClockSample[]>();
  private readonly maxSamples: number;

  constructor(private readonly options: ClockDisciplineOptions) {
    if (!Number.isFinite(options.maxOffsetMs) || options.maxOffsetMs < 0) throw new RangeError("maxOffsetMs must be non-negative");
    if (!Number.isFinite(options.maxJitterMs) || options.maxJitterMs < 0) throw new RangeError("maxJitterMs must be non-negative");
    this.maxSamples = options.maxSamples ?? 64;
    if (!Number.isInteger(this.maxSamples) || this.maxSamples < 2) throw new RangeError("maxSamples must be an integer >= 2");
  }

  record(sample: ClockSample): ClockStatus {
    if (!sample.sourceId.trim()) throw new Error("sourceId is required");
    for (const value of [sample.sourceTimestamp, sample.referenceTimestamp, sample.observedAt]) {
      if (!Number.isFinite(value)) throw new RangeError("clock timestamps must be finite");
    }
    const items = this.samples.get(sample.sourceId) ?? [];
    items.push({ ...sample });
    while (items.length > this.maxSamples) items.shift();
    this.samples.set(sample.sourceId, items);
    return this.status(sample.sourceId);
  }

  status(sourceId: string): ClockStatus {
    const items = this.samples.get(sourceId) ?? [];
    if (items.length === 0) {
      return { sourceId, offsetMs: Number.POSITIVE_INFINITY, jitterMs: Number.POSITIVE_INFINITY, samples: 0, synchronized: false, updatedAt: 0 };
    }
    const offsets = items.map((item) => item.sourceTimestamp - item.referenceTimestamp);
    const offsetMs = offsets.reduce((sum, value) => sum + value, 0) / offsets.length;
    const jitterMs = Math.sqrt(offsets.reduce((sum, value) => sum + (value - offsetMs) ** 2, 0) / offsets.length);
    const updatedAt = items.at(-1)?.observedAt ?? 0;
    return {
      sourceId,
      offsetMs,
      jitterMs,
      samples: items.length,
      synchronized: Math.abs(offsetMs) <= this.options.maxOffsetMs && jitterMs <= this.options.maxJitterMs,
      updatedAt
    };
  }

  normalize(sourceId: string, sourceTimestamp: number): number {
    const status = this.status(sourceId);
    if (!status.synchronized) throw new Error(`clock-unsynchronized:${sourceId}`);
    return sourceTimestamp - status.offsetMs;
  }

  assertSynchronized(sourceId: string): void {
    const status = this.status(sourceId);
    if (!status.synchronized) throw new Error(`clock-unsynchronized:${sourceId}`);
  }
}
