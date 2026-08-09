export type AdaptationSignal = {
  kind: "sensor" | "actuator" | "environment" | "timing" | "authority" | "resource" | "communication" | "unknown";
  severity: "info" | "low" | "medium" | "high" | "critical";
  confidence: number;
  description: string;
  timestamp: number;
};

export type AdaptationDirective = {
  mode: "continue" | "constrain" | "diagnose" | "recalibrate" | "degrade" | "request-help" | "safe-state";
  reasons: string[];
};

/** Converts unusual conditions into explicit adaptation modes instead of
 * assuming normal operation continues. Unknown and contradictory conditions
 * bias toward diagnosis or constraint rather than silent confidence. */
export class EdgeCaseAdaptationSupervisor {
  decide(signals: AdaptationSignal[]): AdaptationDirective {
    const reasons = signals.map((signal) => `${signal.kind}:${signal.severity}:${signal.description}`);
    if (signals.some((signal) => signal.severity === "critical")) return { mode: "safe-state", reasons };
    if (signals.some((signal) => signal.kind === "authority" && signal.severity !== "info")) return { mode: "request-help", reasons };
    if (signals.some((signal) => signal.kind === "timing" && signal.severity === "high")) return { mode: "degrade", reasons };
    if (signals.some((signal) => signal.kind === "unknown" || signal.confidence < 0.4)) return { mode: "diagnose", reasons };
    if (signals.some((signal) => signal.kind === "sensor" || signal.kind === "actuator")) return { mode: "recalibrate", reasons };
    if (signals.some((signal) => signal.severity === "high" || signal.severity === "medium")) return { mode: "constrain", reasons };
    return { mode: "continue", reasons };
  }
}
