export type UplinkCommand = {
  id: string;
  source: string;
  capability: string;
  payload: Record<string, unknown>;
  issuedAt: number;
  expiresAt: number;
  priority: 0 | 1 | 2 | 3 | 4 | 5;
};

export type UplinkAuthority = {
  validate(command: UplinkCommand): string[];
};

export class GovernedUplink {
  constructor(private readonly authority: UplinkAuthority) {}

  accept(command: UplinkCommand): UplinkCommand {
    if (Date.now() > command.expiresAt) throw new Error("Uplink command expired");
    const reasons = this.authority.validate(command);
    if (reasons.length > 0) throw new Error(`Uplink command denied: ${reasons.join(", ")}`);
    return Object.freeze({ ...command, payload: Object.freeze({ ...command.payload }) });
  }
}
