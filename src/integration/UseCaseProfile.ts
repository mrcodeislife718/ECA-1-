export type UseCaseCriticality = "low" | "medium" | "high" | "critical";

export type UseCaseProfile = {
  id: string;
  industry?: string;
  environment: string[];
  tasks: string[];
  humansPresent: boolean;
  autonomyLevel: "assistive" | "supervised" | "autonomous" | "mixed";
  criticality: UseCaseCriticality;
  operatingHoursPerDay?: number;
  payloadClasses?: string[];
  environmentalHazards?: string[];
  regulatoryConstraints?: string[];
  connectivityAssumptions?: string[];
  energyConstraints?: string[];
  precisionRequirements?: string[];
  throughputRequirements?: string[];
  customDimensions?: Record<string, unknown>;
};

export type UseCaseEdgeCase = {
  id: string;
  category: string;
  scenario: string;
  whyItMatters: string;
  severity: UseCaseCriticality;
  detectionSignals: string[];
  requiredResponse: string[];
  validationMethod: string[];
};
