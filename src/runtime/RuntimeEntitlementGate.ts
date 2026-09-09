import { LicensingEngine } from "../commercial/LicensingEngine.js";

export type RuntimeFeatureRequest = {
  scopeId: string;
  feature: string;
  requestedAt?: number;
};

export class RuntimeEntitlementGate {
  constructor(private readonly licensing: LicensingEngine) {}

  authorize(request: RuntimeFeatureRequest): void {
    const decision = this.licensing.validate(
      request.scopeId,
      request.feature,
      request.requestedAt ?? Date.now()
    );

    if (!decision.allowed) {
      throw new Error(
        `Runtime feature ${request.feature} unavailable for ${request.scopeId}: ${decision.reasons.join(",")}`
      );
    }
  }

  permitted(request: RuntimeFeatureRequest): boolean {
    return this.licensing.validate(
      request.scopeId,
      request.feature,
      request.requestedAt ?? Date.now()
    ).allowed;
  }
}
