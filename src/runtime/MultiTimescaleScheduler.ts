export type LoopClass = "emergency" | "reflex" | "sensorimotor" | "deliberative" | "recovery" | "learning";

export type ScheduledWork = { id: string; loop: LoopClass; deadlineMs: number; createdAt: number; run: () => Promise<void> | void };

const priority: Record<LoopClass, number> = { emergency: 0, reflex: 1, sensorimotor: 2, recovery: 3, deliberative: 4, learning: 5 };

export class MultiTimescaleScheduler {
  private readonly queue: ScheduledWork[] = [];

  enqueue(work: ScheduledWork): void { this.queue.push(work); }

  pending(): ScheduledWork[] {
    return [...this.queue].sort((a, b) => priority[a.loop] - priority[b.loop] || a.createdAt - b.createdAt);
  }

  async runNext(now = Date.now()): Promise<{ id: string; missedDeadline: boolean } | undefined> {
    const next = this.pending()[0];
    if (!next) return undefined;
    this.queue.splice(this.queue.findIndex((item) => item.id === next.id), 1);
    const missedDeadline = now - next.createdAt > next.deadlineMs;
    await next.run();
    return { id: next.id, missedDeadline };
  }
}
