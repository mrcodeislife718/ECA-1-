export type ContactObservation = {
  source: string;
  timestamp: number;
  normalForceN?: number;
  tangentialForceN?: number;
  torqueNm?: number;
  slipVelocity?: number;
  contactArea?: number;
  confidence: number;
};

export type ContactState = "free" | "approach" | "stable-contact" | "slipping" | "overload" | "unknown";

export type ContactEstimate = {
  state: ContactState;
  confidence: number;
  totalNormalForceN: number;
  totalTangentialForceN: number;
  maxTorqueNm: number;
  sources: string[];
  timestamp: number;
  reasons: string[];
};

export type ContactLimits = {
  approachForceN: number;
  stableForceN: number;
  overloadForceN: number;
  slipRatio: number;
  maxObservationAgeMs: number;
};

export class ContactStateEstimator {
  constructor(private readonly limits: ContactLimits) {
    if (!(limits.approachForceN >= 0 && limits.stableForceN >= limits.approachForceN && limits.overloadForceN > limits.stableForceN)) {
      throw new RangeError("contact force limits must be ordered and non-negative");
    }
    if (!Number.isFinite(limits.slipRatio) || limits.slipRatio <= 0) throw new RangeError("slipRatio must be positive");
    if (!Number.isFinite(limits.maxObservationAgeMs) || limits.maxObservationAgeMs <= 0) throw new RangeError("maxObservationAgeMs must be positive");
  }

  estimate(observations: ContactObservation[], now = Date.now()): ContactEstimate {
    const valid = observations.filter((item) => {
      if (!Number.isFinite(item.confidence) || item.confidence < 0 || item.confidence > 1) return false;
      if (!Number.isFinite(item.timestamp) || item.timestamp > now) return false;
      return now - item.timestamp <= this.limits.maxObservationAgeMs;
    });

    if (valid.length === 0) {
      return {
        state: "unknown",
        confidence: 0,
        totalNormalForceN: 0,
        totalTangentialForceN: 0,
        maxTorqueNm: 0,
        sources: [],
        timestamp: now,
        reasons: ["no-fresh-contact-observations"]
      };
    }

    const totalNormalForceN = valid.reduce((sum, item) => sum + Math.max(0, item.normalForceN ?? 0), 0);
    const totalTangentialForceN = valid.reduce((sum, item) => sum + Math.abs(item.tangentialForceN ?? 0), 0);
    const maxTorqueNm = Math.max(0, ...valid.map((item) => Math.abs(item.torqueNm ?? 0)));
    const confidence = valid.reduce((sum, item) => sum + item.confidence, 0) / valid.length;
    const slipSignal = valid.some((item) => (item.slipVelocity ?? 0) > 0) ||
      (totalNormalForceN > 0 && totalTangentialForceN / totalNormalForceN >= this.limits.slipRatio);

    let state: ContactState;
    const reasons: string[] = [];
    if (totalNormalForceN >= this.limits.overloadForceN) {
      state = "overload";
      reasons.push("normal-force-overload");
    } else if (slipSignal) {
      state = "slipping";
      reasons.push("slip-detected");
    } else if (totalNormalForceN >= this.limits.stableForceN) {
      state = "stable-contact";
    } else if (totalNormalForceN >= this.limits.approachForceN) {
      state = "approach";
    } else {
      state = "free";
    }

    return {
      state,
      confidence,
      totalNormalForceN,
      totalTangentialForceN,
      maxTorqueNm,
      sources: [...new Set(valid.map((item) => item.source))].sort(),
      timestamp: now,
      reasons
    };
  }

  assertWithinEnvelope(estimate: ContactEstimate): void {
    if (estimate.state === "overload") throw new Error("contact-force-envelope-exceeded");
    if (estimate.state === "unknown") throw new Error("contact-state-unknown");
  }
}
