export type HotSwapState = {
  fromPlatform: string;
  toPlatform: string;
  missionId?: string;
  transferableCapabilities: string[];
  requalificationRequired: string[];
  authorityValid: boolean;
  worldStateFresh: boolean;
};

export type HotSwapDecision = {
  allowed: boolean;
  mode: "handoff" | "pause-and-qualify" | "blocked";
  reasons: string[];
};

export class HotSwapCoordinator {
  decide(state: HotSwapState): HotSwapDecision {
    const reasons: string[] = [];
    if (!state.authorityValid) reasons.push("authority-invalid");
    if (!state.worldStateFresh) reasons.push("world-state-stale");
    if (state.transferableCapabilities.length === 0) reasons.push("no-shared-capabilities");

    if (reasons.length > 0) return { allowed: false, mode: "blocked", reasons };
    if (state.requalificationRequired.length > 0) {
      return {
        allowed: true,
        mode: "pause-and-qualify",
        reasons: state.requalificationRequired.map((item) => `requalify:${item}`)
      };
    }
    return { allowed: true, mode: "handoff", reasons: [] };
  }
}
