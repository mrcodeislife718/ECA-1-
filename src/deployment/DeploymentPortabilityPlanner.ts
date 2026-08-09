import { BrainDeploymentTarget, type BrainDeploymentMode, type ComputeClass, type DeploymentRequirements } from "./BrainDeploymentTarget.js";
import { PortableBrainPackage } from "./PortableBrainPackage.js";

export type PortabilityPlan = {
  selectedMode?: BrainDeploymentMode;
  softwareOnly: boolean;
  externalHardwareRequired: boolean;
  eligibleModes: BrainDeploymentMode[];
  blockers: string[];
};

/**
 * Chooses the least-friction deployment that preserves ECA-1's timing and
 * safety requirements. Dedicated ECA-1 hardware is never assumed. It is only
 * indicated when the robot/site lacks sufficient qualified compute.
 */
export class DeploymentPortabilityPlanner {
  private readonly target = new BrainDeploymentTarget();

  plan(pkg: PortableBrainPackage, compute: ComputeClass, requirements: DeploymentRequirements): PortabilityPlan {
    const packageQualification = pkg.qualify(compute);
    const decisions = this.target.evaluate(compute, requirements);
    const eligibleModes = decisions.filter((decision) => decision.eligible).map((decision) => decision.mode);
    const blockers = [...packageQualification.reasons];

    if (packageQualification.installable && eligibleModes.length > 0) {
      const selected = this.target.select(decisions);
      return {
        selectedMode: selected.mode,
        softwareOnly: selected.mode === "downloaded-onboard" || selected.mode === "preinstalled-oem" || selected.mode === "site-runtime" || selected.mode === "hybrid-local-site",
        externalHardwareRequired: selected.mode === "external-edge-runtime",
        eligibleModes,
        blockers
      };
    }

    // If existing compute cannot host the package, the product may offer an
    // external edge runtime, but cognition is still the same portable ECA-1 brain.
    if (eligibleModes.includes("external-edge-runtime")) {
      return {
        selectedMode: "external-edge-runtime",
        softwareOnly: false,
        externalHardwareRequired: true,
        eligibleModes,
        blockers
      };
    }

    return { softwareOnly: false, externalHardwareRequired: false, eligibleModes, blockers: [...blockers, "no-qualified-portable-deployment"] };
  }
}
