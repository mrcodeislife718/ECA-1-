import type { PlatformAdapter, RobotState } from "../contracts.js";
import { EmbodimentHandshake, type EmbodimentProfile, type EmbodimentRequirement } from "./EmbodimentHandshake.js";

export type TransitionContext = {
  missionId?: string;
  mission: Record<string, unknown>;
  world: Record<string, unknown>;
  operatorAuthority?: string;
};

export type TransitionResult = {
  fromPlatformId?: string;
  toPlatformId: string;
  profile: EmbodimentProfile;
  sharedCapabilities: string[];
  preservedContext: TransitionContext;
  ready: boolean;
  blockers: string[];
};

/**
 * Preserves mission/world continuity when ECA-1 is attached to a different
 * embodiment. Body-specific state is deliberately not copied blindly.
 */
export class FrictionlessTransitionCoordinator {
  constructor(private readonly handshake = new EmbodimentHandshake()) {}

  async transition(input: {
    from?: { platform: PlatformAdapter; state: RobotState };
    to: PlatformAdapter;
    requirements?: EmbodimentRequirement[];
    context: TransitionContext;
  }): Promise<TransitionResult> {
    const toProfile = await this.handshake.profile(input.to, input.requirements ?? []);
    let sharedCapabilities: string[] = [];
    let fromPlatformId: string | undefined;

    if (input.from) {
      fromPlatformId = input.from.platform.id;
      const fromProfile = await this.handshake.profile(input.from.platform);
      sharedCapabilities = this.handshake.sharedCapabilities(fromProfile, toProfile);
    }

    const blockers = [...toProfile.blockers];
    if (input.requirements?.some((r) => r.required) && !toProfile.ready) {
      blockers.push("mission-requirements-not-satisfied");
    }

    return {
      fromPlatformId,
      toPlatformId: input.to.id,
      profile: toProfile,
      sharedCapabilities,
      preservedContext: {
        missionId: input.context.missionId,
        mission: { ...input.context.mission },
        world: { ...input.context.world },
        operatorAuthority: input.context.operatorAuthority
      },
      ready: blockers.length === 0,
      blockers: [...new Set(blockers)]
    };
  }
}
