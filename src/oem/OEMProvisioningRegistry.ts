export type OEMProvisioningState = "registered" | "provisioned" | "activated" | "retired";

export type OEMProvisionedUnit = {
  unitId: string;
  oemId: string;
  manufacturer: string;
  model: string;
  hardwareRevision?: string;
  firmwareVersion?: string;
  deviceIdentity: string;
  state: OEMProvisioningState;
  registeredAt: number;
  provisionedAt?: number;
  activatedAt?: number;
  retiredAt?: number;
};

export class OEMProvisioningRegistry {
  private readonly units = new Map<string, OEMProvisionedUnit>();
  private readonly identities = new Set<string>();

  register(unit: Omit<OEMProvisionedUnit, "state" | "registeredAt">, now = Date.now()): void {
    if (this.units.has(unit.unitId)) throw new Error(`Duplicate OEM unit: ${unit.unitId}`);
    if (this.identities.has(unit.deviceIdentity)) throw new Error(`Duplicate device identity: ${unit.deviceIdentity}`);
    if (!unit.unitId.trim() || !unit.oemId.trim() || !unit.deviceIdentity.trim()) {
      throw new Error("unitId, oemId, and deviceIdentity are required");
    }

    this.units.set(unit.unitId, { ...unit, state: "registered", registeredAt: now });
    this.identities.add(unit.deviceIdentity);
  }

  markProvisioned(unitId: string, now = Date.now()): void {
    const unit = this.require(unitId);
    if (unit.state !== "registered") throw new Error(`Cannot provision ${unitId} from ${unit.state}`);
    this.units.set(unitId, { ...unit, state: "provisioned", provisionedAt: now });
  }

  markActivated(unitId: string, now = Date.now()): void {
    const unit = this.require(unitId);
    if (unit.state !== "provisioned") throw new Error(`Cannot activate ${unitId} from ${unit.state}`);
    this.units.set(unitId, { ...unit, state: "activated", activatedAt: now });
  }

  retire(unitId: string, now = Date.now()): void {
    const unit = this.require(unitId);
    if (unit.state === "retired") return;
    this.units.set(unitId, { ...unit, state: "retired", retiredAt: now });
  }

  get(unitId: string): OEMProvisionedUnit | undefined {
    const unit = this.units.get(unitId);
    return unit ? { ...unit } : undefined;
  }

  list(oemId?: string): OEMProvisionedUnit[] {
    return [...this.units.values()]
      .filter((unit) => oemId === undefined || unit.oemId === oemId)
      .map((unit) => ({ ...unit }));
  }

  private require(unitId: string): OEMProvisionedUnit {
    const unit = this.units.get(unitId);
    if (!unit) throw new Error(`Unknown OEM unit: ${unitId}`);
    return unit;
  }
}
