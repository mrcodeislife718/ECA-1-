import type { UseCaseProfile, UseCaseEdgeCase } from "./UseCaseProfile.js";
import { UseCaseEdgeCaseGenerator } from "./UseCaseEdgeCaseGenerator.js";

export type UseCaseDeploymentPack = {
  profile: UseCaseProfile;
  edgeCases: UseCaseEdgeCase[];
  requiredValidation: string[];
  requiredRuntimeMonitors: string[];
  requiredFallbacks: string[];
  unresolvedQuestions: string[];
};

export class UseCaseDeploymentPackBuilder {
  private readonly generator = new UseCaseEdgeCaseGenerator();

  build(profile: UseCaseProfile): UseCaseDeploymentPack {
    const edgeCases = this.generator.generate(profile);
    const requiredValidation = [...new Set(edgeCases.flatMap((item) => item.validationMethod))];
    const requiredRuntimeMonitors = [...new Set(edgeCases.flatMap((item) => item.detectionSignals))];
    const requiredFallbacks = [...new Set(edgeCases.flatMap((item) => item.requiredResponse))];
    const unresolvedQuestions: string[] = [];

    if (profile.tasks.length === 0) unresolvedQuestions.push("What physical tasks must this deployment perform?");
    if (profile.environment.length === 0) unresolvedQuestions.push("What environments will the robot operate in?");
    if (profile.humansPresent && !profile.customDimensions?.humanInteractionPolicy) {
      unresolvedQuestions.push("What human-interaction and proximity policy applies?");
    }
    if (!profile.operatingHoursPerDay) unresolvedQuestions.push("What duty cycle and operating hours should qualification assume?");
    if ((profile.precisionRequirements?.length ?? 0) === 0) unresolvedQuestions.push("What precision/tolerance requirements define success?");

    return {
      profile: { ...profile },
      edgeCases,
      requiredValidation,
      requiredRuntimeMonitors,
      requiredFallbacks,
      unresolvedQuestions
    };
  }
}
