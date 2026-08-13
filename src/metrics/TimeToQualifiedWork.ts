export type TQWMilestone =
  | "connected"
  | "discovered"
  | "integrated"
  | "calibrated"
  | "qualified"
  | "mission-ready"
  | "useful-work-started";

export type TQWEvent = { milestone: TQWMilestone; timestamp: number; details?: Record<string, unknown> };

export type TQWReport = {
  complete: boolean;
  totalMs?: number;
  segmentMs: Partial<Record<TQWMilestone, number>>;
  missing: TQWMilestone[];
};

const FLOW: TQWMilestone[] = [
  "connected",
  "discovered",
  "integrated",
  "calibrated",
  "qualified",
  "mission-ready",
  "useful-work-started"
];

export class TimeToQualifiedWork {
  private readonly events = new Map<TQWMilestone, TQWEvent>();

  mark(event: TQWEvent): void {
    const current = this.events.get(event.milestone);
    if (!current || event.timestamp < current.timestamp) this.events.set(event.milestone, { ...event });
  }

  report(): TQWReport {
    const missing = FLOW.filter((stage) => !this.events.has(stage));
    const segmentMs: Partial<Record<TQWMilestone, number>> = {};
    for (let i = 1; i < FLOW.length; i += 1) {
      const previousStage = FLOW[i - 1];
      const currentStage = FLOW[i];

      if (!previousStage || !currentStage) continue;

      const previous = this.events.get(previousStage);
      const current = this.events.get(currentStage);

      if (previous && current) {
        segmentMs[currentStage] = Math.max(
          0,
          current.timestamp - previous.timestamp
        );
      }
    }

    const first = this.events.get("connected");
    const last = this.events.get("useful-work-started");

    return {
      complete: missing.length === 0,
      segmentMs,
      missing,
      ...(first && last
        ? { totalMs: Math.max(0, last.timestamp - first.timestamp) }
        : {})
    };
  }
}
