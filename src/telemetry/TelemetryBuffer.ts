export type TelemetrySeverity = "debug" | "info" | "warn" | "error" | "critical";

export type TelemetryRecord = {
  id: string;
  deviceId: string;
  timestamp: number;
  kind: string;
  severity: TelemetrySeverity;
  payload: Record<string, unknown>;
  traceId?: string;
  commandId?: string;
};

export class TelemetryBuffer {
  private readonly records: TelemetryRecord[] = [];

  constructor(private readonly capacity = 10_000) {
    if (!Number.isInteger(capacity) || capacity < 1) throw new RangeError("capacity must be a positive integer");
  }

  append(record: TelemetryRecord): void {
    if (!record.id.trim() || !record.deviceId.trim() || !record.kind.trim()) throw new Error("telemetry identity fields are required");
    if (!Number.isFinite(record.timestamp)) throw new Error("telemetry timestamp must be finite");
    this.records.push(structuredClone(record));
    while (this.records.length > this.capacity) this.records.shift();
  }

  query(options: { deviceId?: string; traceId?: string; commandId?: string; since?: number; severity?: TelemetrySeverity } = {}): TelemetryRecord[] {
    return this.records.filter((record) => {
      if (options.deviceId !== undefined && record.deviceId !== options.deviceId) return false;
      if (options.traceId !== undefined && record.traceId !== options.traceId) return false;
      if (options.commandId !== undefined && record.commandId !== options.commandId) return false;
      if (options.since !== undefined && record.timestamp < options.since) return false;
      if (options.severity !== undefined && record.severity !== options.severity) return false;
      return true;
    }).map((record) => structuredClone(record));
  }

  incidentBundle(deviceId: string, since: number): { deviceId: string; since: number; records: TelemetryRecord[] } {
    return { deviceId, since, records: this.query({ deviceId, since }) };
  }

  size(): number {
    return this.records.length;
  }
}
