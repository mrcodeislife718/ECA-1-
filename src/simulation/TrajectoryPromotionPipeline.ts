import { createHash } from "node:crypto";

export type TrajectoryFrame = {
  timestamp: number;
  observation: Record<string, unknown>;
  action: Record<string, unknown>;
  reward?: number;
  terminal?: boolean;
};

export type TrajectoryArtifact = {
  id: string;
  embodimentId: string;
  environmentId: string;
  generator: string;
  generatedAt: number;
  frames: TrajectoryFrame[];
  domainRandomization?: Record<string, unknown>;
  sourceEvidence?: string[];
};

export type TrajectoryQualification = {
  accepted: boolean;
  reasons: string[];
  frameCount: number;
  durationMs: number;
  digest: string;
};

export type TrajectoryPromotionRecord = {
  artifactId: string;
  digest: string;
  promotedAt: number;
  target: string;
  evidence: string[];
};

export class TrajectoryPromotionPipeline {
  private readonly promoted = new Map<string, TrajectoryPromotionRecord>();

  qualify(artifact: TrajectoryArtifact): TrajectoryQualification {
    const reasons: string[] = [];
    if (!artifact.id.trim()) reasons.push("artifact-id-required");
    if (!artifact.embodimentId.trim()) reasons.push("embodiment-id-required");
    if (!artifact.environmentId.trim()) reasons.push("environment-id-required");
    if (!artifact.generator.trim()) reasons.push("generator-required");
    if (artifact.frames.length < 2) reasons.push("insufficient-frames");

    let previousTimestamp = -Infinity;
    for (const frame of artifact.frames) {
      if (!Number.isFinite(frame.timestamp)) reasons.push("invalid-frame-timestamp");
      if (frame.timestamp <= previousTimestamp) reasons.push("non-monotonic-timestamps");
      previousTimestamp = frame.timestamp;
      if (frame.reward !== undefined && !Number.isFinite(frame.reward)) reasons.push("invalid-reward");
    }

    const durationMs = artifact.frames.length > 1
      ? artifact.frames[artifact.frames.length - 1]!.timestamp - artifact.frames[0]!.timestamp
      : 0;
    if (durationMs <= 0) reasons.push("invalid-duration");

    const digest = this.digest(artifact);
    return {
      accepted: reasons.length === 0,
      reasons: [...new Set(reasons)],
      frameCount: artifact.frames.length,
      durationMs,
      digest
    };
  }

  promote(
    artifact: TrajectoryArtifact,
    target: string,
    evidence: string[],
    promotedAt = Date.now()
  ): TrajectoryPromotionRecord {
    const qualification = this.qualify(artifact);
    if (!qualification.accepted) {
      throw new Error(`Trajectory not qualified: ${qualification.reasons.join(",")}`);
    }
    if (!target.trim()) throw new Error("promotion target is required");
    if (evidence.length === 0 || evidence.some((item) => !item.trim())) {
      throw new Error("promotion evidence is required");
    }

    const existing = this.promoted.get(artifact.id);
    if (existing && existing.digest !== qualification.digest) {
      throw new Error(`Trajectory artifact id ${artifact.id} already promoted with different content`);
    }

    const record = {
      artifactId: artifact.id,
      digest: qualification.digest,
      promotedAt,
      target,
      evidence: [...evidence]
    };
    this.promoted.set(artifact.id, record);
    return structuredClone(record);
  }

  record(artifactId: string): TrajectoryPromotionRecord | undefined {
    const found = this.promoted.get(artifactId);
    return found ? structuredClone(found) : undefined;
  }

  private digest(artifact: TrajectoryArtifact): string {
    return createHash("sha256").update(JSON.stringify(artifact)).digest("hex");
  }
}
