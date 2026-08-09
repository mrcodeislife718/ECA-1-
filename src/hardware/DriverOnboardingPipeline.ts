import type { MissionRequirement, RuntimeReadiness } from "../runtime/UniversalEmbodimentRuntime.js";
import { UniversalEmbodimentRuntime } from "../runtime/UniversalEmbodimentRuntime.js";
import type { StateFact } from "../runtime/StateTrustGuard.js";
import { DriverQualification, type DriverQualificationReport } from "./DriverQualification.js";
import { PhysicalRobotAdapter } from "./PhysicalRobotAdapter.js";
import type { PhysicalRobotDriver } from "./UniversalPhysicalRobotContract.js";

export type PhysicalOnboardingResult = {
  adapter: PhysicalRobotAdapter;
  driverQualification: DriverQualificationReport;
  runtimeReadiness?: RuntimeReadiness;
  eligibleForCalibration: boolean;
  eligibleForMission: boolean;
  reasons: string[];
};

/**
 * End-to-end real-hardware onboarding. Driver connection, non-actuating
 * qualification, runtime trust checks, and mission eligibility remain separate
 * gates so connectivity can never be mistaken for permission to operate.
 */
export class DriverOnboardingPipeline {
  readonly qualification = new DriverQualification();

  constructor(readonly runtime = new UniversalEmbodimentRuntime()) {}

  async onboard(
    driver: PhysicalRobotDriver,
    requirements: MissionRequirement[] = [],
    facts: StateFact[] = []
  ): Promise<PhysicalOnboardingResult> {
    const adapter = await new PhysicalRobotAdapter(driver).initialize();
    const driverQualification = await this.qualification.inspect(driver);
    const reasons = driverQualification.issues
      .filter((issue) => issue.severity === "blocker")
      .map((issue) => `driver:${issue.code}`);

    if (!driverQualification.passed) {
      return {
        adapter,
        driverQualification,
        eligibleForCalibration: false,
        eligibleForMission: false,
        reasons
      };
    }

    const eligibleForCalibration = true;
    if (requirements.length === 0) {
      return {
        adapter,
        driverQualification,
        eligibleForCalibration,
        eligibleForMission: false,
        reasons: ["mission-requirements-not-provided"]
      };
    }

    const runtimeReadiness = await this.runtime.assess(adapter, requirements, facts);
    if (!runtimeReadiness.ready) reasons.push(...runtimeReadiness.reasons);

    return {
      adapter,
      driverQualification,
      runtimeReadiness,
      eligibleForCalibration,
      eligibleForMission: runtimeReadiness.ready,
      reasons
    };
  }
}
