import type { InstalledVersion } from "./SignedUpdateManager.js";

export type RollbackArtifact = {
  version: string;
  sha256: string;
  artifact: Uint8Array;
};

export type RollbackInstaller = {
  stage(artifact: RollbackArtifact): Promise<void>;
  activate(artifact: RollbackArtifact): Promise<void>;
  verifyActive(version: string, sha256: string): Promise<boolean>;
  restorePrevious?(): Promise<void>;
};

export type RollbackArtifactStore = {
  get(version: string, sha256: string): Promise<RollbackArtifact | undefined>;
};

export type RollbackResult = {
  target: InstalledVersion;
  status: "activated" | "failed";
  startedAt: number;
  completedAt: number;
  fault?: string;
};

export class RollbackExecutor {
  constructor(
    private readonly store: RollbackArtifactStore,
    private readonly installer: RollbackInstaller,
    private readonly now: () => number = Date.now
  ) {}

  async execute(target: InstalledVersion): Promise<RollbackResult> {
    const startedAt = this.now();
    const artifact = await this.store.get(target.version, target.sha256);
    if (!artifact) {
      return { target: { ...target }, status: "failed", startedAt, completedAt: this.now(), fault: "rollback-artifact-missing" };
    }
    if (artifact.version !== target.version || artifact.sha256.toLowerCase() !== target.sha256.toLowerCase()) {
      return { target: { ...target }, status: "failed", startedAt, completedAt: this.now(), fault: "rollback-artifact-identity-mismatch" };
    }

    try {
      await this.installer.stage(artifact);
      await this.installer.activate(artifact);
      const verified = await this.installer.verifyActive(target.version, target.sha256);
      if (!verified) throw new Error("rollback-verification-failed");
      return { target: { ...target }, status: "activated", startedAt, completedAt: this.now() };
    } catch (error) {
      try {
        await this.installer.restorePrevious?.();
      } catch {
        // Preserve the original rollback fault; recovery failure is surfaced by the caller's telemetry path.
      }
      return {
        target: { ...target },
        status: "failed",
        startedAt,
        completedAt: this.now(),
        fault: error instanceof Error ? error.message : String(error)
      };
    }
  }
}
