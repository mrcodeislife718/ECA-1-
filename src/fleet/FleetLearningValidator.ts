export type FleetLearningArtifact = {
  id: string;
  sourcePlatform: string;
  evidence: string[];
  confidence: number;
  compatiblePlatforms: string[];
  safetyRegressionPassed: boolean;
  replayValidated: boolean;
  version: number;
};

export class FleetLearningValidator {
  validate(artifact: FleetLearningArtifact, targetPlatform: string): { approved: boolean; reasons: string[] } {
    const reasons: string[] = [];
    if (artifact.confidence < 0.8) reasons.push("insufficient-confidence");
    if (artifact.evidence.length < 2) reasons.push("insufficient-evidence");
    if (!artifact.replayValidated) reasons.push("replay-not-validated");
    if (!artifact.safetyRegressionPassed) reasons.push("safety-regression-not-passed");
    if (!artifact.compatiblePlatforms.includes(targetPlatform)) reasons.push("platform-not-compatible");
    return { approved: reasons.length === 0, reasons };
  }
}
