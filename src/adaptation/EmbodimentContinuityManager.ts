export type ContinuityState = {
  mission: Record<string, unknown>;
  world: Record<string, unknown>;
  authority: Record<string, unknown>;
  transferableLearning: Record<string, unknown>;
  bodySpecific: Record<string, unknown>;
  capturedAt: number;
};

export type ContinuityTransfer = {
  preserved: Omit<ContinuityState, "bodySpecific">;
  discardedBodySpecificKeys: string[];
  warnings: string[];
};

/** Preserves mission/world/authority continuity across embodiment changes while
 * explicitly dropping body-specific assumptions that must be re-qualified. */
export class EmbodimentContinuityManager {
  transfer(state: ContinuityState): ContinuityTransfer {
    const discardedBodySpecificKeys = Object.keys(state.bodySpecific);
    return {
      preserved: {
        mission: structuredClone(state.mission),
        world: structuredClone(state.world),
        authority: structuredClone(state.authority),
        transferableLearning: structuredClone(state.transferableLearning),
        capturedAt: state.capturedAt
      },
      discardedBodySpecificKeys,
      warnings: discardedBodySpecificKeys.length > 0
        ? ["body-specific-state-requires-requalification"]
        : []
    };
  }
}
