import type { PlatformAdapter } from "../contracts.js";
import { EmbodimentHandshake, type EmbodimentRequirement } from "../integration/EmbodimentHandshake.js";
import { UniversalConformanceHarness } from "../verification/UniversalConformanceHarness.js";
import type { PhysicalRobotDriver } from "./UniversalPhysicalRobotContract.js";
import { PhysicalRobotAdapter } from "./PhysicalRobotAdapter.js";

export type RealRobotOnboardingResult = {
  adapter: PlatformAdapter;
  descriptorId: string;
  ready: boolean;
  blockers: string[];
  requiresCalibration: string[];
};

/**
 * Safe entry path for real hardware. A physical robot is not considered ready
 * simply because a driver connects. It must expose a valid descriptor, pass
 * the universal adapter contract, satisfy mission requirements, and identify
 * capabilities that still require physical calibration/qualification.
 */
export class RealRobotOnboarding {
  private readonly handshake = new EmbodimentHandshake();
  private readonly conformance = new UniversalConformanceHarness();

  async onboard(driver: PhysicalRobotDriver, requirements: EmbodimentRequirement[] = []): Promise<RealRobotOnboardingResult> {
    const descriptor = await driver.descriptor();
    if (!descriptor.id) throw new Error("Physical robot descriptor requires a stable id");
    if (descriptor.endpoints.length === 0) throw new Error("Physical robot descriptor requires at least one endpoint");

    const adapter = await new PhysicalRobotAdapter(driver).initialize();
    const conformance = await this.conformance.verify(adapter);
    const profile = await this.handshake.profile(adapter, requirements);
    const capabilities = await adapter.capabilities();

    const blockers = [
      ...conformance.failures.map((failure) => `conformance:${failure}`),
      ...profile.blockers.map((failure) => `profile:${failure}`)
    ];

    return {
      adapter,
      descriptorId: descriptor.id,
      ready: blockers.length === 0,
      blockers,
      requiresCalibration: capabilities.map((capability) => capability.id)
    };
  }
}
