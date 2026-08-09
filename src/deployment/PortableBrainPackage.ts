import type { BrainDeploymentMode, ComputeClass, DeploymentRequirements } from "./BrainDeploymentTarget.js";

export type BrainModule = {
  id: string;
  version: string;
  required: boolean;
  estimatedMemoryMb: number;
  estimatedStorageMb: number;
  acceleratorOptional?: boolean;
};

export type PortableBrainManifest = {
  brainId: string;
  version: string;
  modules: BrainModule[];
  supportedModes: BrainDeploymentMode[];
  requirements: DeploymentRequirements;
  integrity: { algorithm: string; digest: string };
  rollbackVersion?: string;
};

export type PackageQualification = {
  installable: boolean;
  reasons: string[];
  requiredMemoryMb: number;
  requiredStorageMb: number;
};

/**
 * Represents ECA-1 as a portable software brain package. Packaging, integrity,
 * rollback, and resource qualification are first-class so deployment can be a
 * download when the robot already has suitable compute.
 */
export class PortableBrainPackage {
  constructor(readonly manifest: PortableBrainManifest) {}

  qualify(compute: ComputeClass): PackageQualification {
    const requiredMemoryMb = Math.max(
      this.manifest.requirements.minimumMemoryMb,
      this.manifest.modules.filter((m) => m.required).reduce((sum, m) => sum + m.estimatedMemoryMb, 0)
    );
    const requiredStorageMb = Math.max(
      this.manifest.requirements.minimumStorageMb,
      this.manifest.modules.reduce((sum, m) => sum + m.estimatedStorageMb, 0)
    );
    const reasons: string[] = [];
    if ((compute.memoryMb ?? 0) < requiredMemoryMb) reasons.push("package-memory-insufficient");
    if ((compute.persistentStorageMb ?? 0) < requiredStorageMb) reasons.push("package-storage-insufficient");
    if (this.manifest.requirements.requiresAccelerator && !compute.accelerator) reasons.push("package-accelerator-missing");
    if (!this.manifest.integrity.digest) reasons.push("package-integrity-missing");
    return { installable: reasons.length === 0, reasons, requiredMemoryMb, requiredStorageMb };
  }
}
