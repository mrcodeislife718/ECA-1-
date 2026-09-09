import type { CandidateAction } from "../contracts.js";
import type { ContactEstimate } from "../perception/ContactStateEstimator.js";
import type { ActuatorHealthReport } from "../hardware/ActuatorHealthFusion.js";

export type ContactActionPolicy = {
  capability: string;
  allowedContactStates: ContactEstimate["state"][];
  minimumConfidence?: number;
  requireHealthyActuator?: boolean;
};

export type ContactActionDecision = {
  allowed: boolean;
  reasons: string[];
};

export class ContactAwareActionGate {
  private readonly policies = new Map<string, ContactActionPolicy>();

  register(policy: ContactActionPolicy): void {
    if (!policy.capability.trim()) throw new Error("capability is required");
    if (policy.allowedContactStates.length === 0) throw new Error("allowedContactStates cannot be empty");
    if (policy.minimumConfidence !== undefined && (policy.minimumConfidence < 0 || policy.minimumConfidence > 1)) {
      throw new RangeError("minimumConfidence must be between 0 and 1");
    }
    this.policies.set(policy.capability, { ...policy, allowedContactStates: [...policy.allowedContactStates] });
  }

  evaluate(action: CandidateAction, contact: ContactEstimate, actuator?: ActuatorHealthReport): ContactActionDecision {
    const policy = this.policies.get(action.capability);
    if (!policy) return { allowed: false, reasons: ["contact-policy-missing"] };
    const reasons: string[] = [];
    if (!policy.allowedContactStates.includes(contact.state)) reasons.push(`contact-state-disallowed:${contact.state}`);
    if (contact.confidence < (policy.minimumConfidence ?? 0)) reasons.push("contact-confidence-insufficient");
    if (contact.state === "overload") reasons.push("contact-overload");
    if (contact.state === "unknown") reasons.push("contact-state-unknown");
    if (policy.requireHealthyActuator) {
      if (!actuator) reasons.push("actuator-health-missing");
      else if (actuator.state === "critical" || actuator.state === "unknown") reasons.push(`actuator-health-${actuator.state}`);
    }
    return { allowed: reasons.length === 0, reasons };
  }

  assertAllowed(action: CandidateAction, contact: ContactEstimate, actuator?: ActuatorHealthReport): void {
    const decision = this.evaluate(action, contact, actuator);
    if (!decision.allowed) throw new Error(`contact-action-denied:${decision.reasons.join(",")}`);
  }
}
