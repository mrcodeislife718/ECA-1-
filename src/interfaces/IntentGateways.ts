export type IntentEnvelope = {
  id: string;
  source: "neural" | "uplink";
  subject: string;
  intent: string;
  confidence: number;
  authorized: boolean;
  consent?: boolean;
  createdAt: number;
  expiresAt: number;
  metadata?: Record<string, unknown>;
};

export class IntentGateway {
  validate(intent: IntentEnvelope, now = Date.now()): { accepted: boolean; reasons: string[] } {
    const reasons: string[] = [];
    if (!intent.authorized) reasons.push("not-authorized");
    if (intent.source === "neural" && intent.consent !== true) reasons.push("neural-consent-required");
    if (intent.confidence < 0.6) reasons.push("low-confidence");
    if (intent.expiresAt <= now) reasons.push("stale-intent");
    return { accepted: reasons.length === 0, reasons };
  }
}
