export type BrainDeploymentMode =
  | "downloaded-onboard"
  | "preinstalled-oem"
  | "external-edge-runtime"
  | "site-runtime"
  | "hybrid-local-site";

export type ComputeClass = {
  architecture?: string;
  operatingSystem?: string;
  cpuCores?: number;
  memoryMb?: number;
  accelerator?: string;
  persistentStorageMb?: number;
  realTimeControllerAvailable?: boolean;
  metadata?: Record<string, unknown>;
};

export type DeploymentRequirements = {
  minimumMemoryMb: number;
  minimumStorageMb: number;
  requiresAccelerator: boolean;
  requiresLocalSafetyPath: boolean;
  maxCriticalPathRoundTripMs: number;
};

export type DeploymentDecision = {
  mode: BrainDeploymentMode;
  eligible: boolean;
  reasons: string[];
};

/**
 * Keeps ECA-1 software-first. A dedicated physical brain is optional, never a
 * cognitive dependency. The same brain package may run on compute already
 * inside the robot, an OEM compute module, an external edge computer, or a
 * site-local runtime as long as the qualified physical-control path remains
 * local and bounded.
 */
export class BrainDeploymentTarget {
  evaluate(
    compute: ComputeClass,
    requirements: DeploymentRequirements,
    preferred: BrainDeploymentMode[] = [
      "downloaded-onboard",
      "preinstalled-oem",
      "external-edge-runtime",
      "hybrid-local-site",
      "site-runtime"
    ]
  ): DeploymentDecision[] {
    return preferred.map((mode) => {
      const reasons: string[] = [];
      if ((compute.memoryMb ?? 0) < requirements.minimumMemoryMb) reasons.push("insufficient-memory");
      if ((compute.persistentStorageMb ?? 0) < requirements.minimumStorageMb) reasons.push("insufficient-storage");
      if (requirements.requiresAccelerator && !compute.accelerator) reasons.push("accelerator-required");
      if (requirements.requiresLocalSafetyPath && mode === "site-runtime" && !compute.realTimeControllerAvailable) {
        reasons.push("local-safety-path-required");
      }
      if (requirements.maxCriticalPathRoundTripMs <= 20 && mode === "site-runtime") {
        reasons.push("critical-path-too-remote");
      }
      return { mode, eligible: reasons.length === 0, reasons };
    });
  }

  select(decisions: DeploymentDecision[]): DeploymentDecision {
    const eligible = decisions.find((decision) => decision.eligible);
    if (!eligible) return { mode: decisions[0]?.mode ?? "downloaded-onboard", eligible: false, reasons: ["no-qualified-deployment-target"] };
    return eligible;
  }
}
