export type WatchdogStatus = {
  id: string;
  deadlineMs: number;
  lastHeartbeat: number;
  missed: boolean;
};

export class WatchdogSupervisor {
  private readonly watches = new Map<string, { deadlineMs: number; lastHeartbeat: number }>();

  register(id: string, deadlineMs: number, now = Date.now()): void {
    if (deadlineMs <= 0) throw new Error("deadlineMs must be > 0");
    this.watches.set(id, { deadlineMs, lastHeartbeat: now });
  }

  heartbeat(id: string, now = Date.now()): void {
    const current = this.watches.get(id);
    if (!current) throw new Error(`Unknown watchdog ${id}`);
    current.lastHeartbeat = now;
  }

  status(now = Date.now()): WatchdogStatus[] {
    return [...this.watches.entries()].map(([id, watch]) => ({
      id,
      deadlineMs: watch.deadlineMs,
      lastHeartbeat: watch.lastHeartbeat,
      missed: now - watch.lastHeartbeat > watch.deadlineMs
    }));
  }

  missed(now = Date.now()): WatchdogStatus[] {
    return this.status(now).filter((status) => status.missed);
  }
}
