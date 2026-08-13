import { LicensingEngine } from "../commercial/LicensingEngine.js";

export type OEMUnit = {
  oemId: string;
  unitId: string;
  manufacturer: string;
  model: string;
  firmware?: string;
  productionBatch?: string;
  activatedAt?: number;
};

export class OEMActivation {
  private readonly units = new Map<string, OEMUnit>();
  constructor(readonly licensing = new LicensingEngine()) {}

  register(unit: OEMUnit): void {
    this.units.set(unit.unitId, { ...unit });
  }

  activate(unitId: string, customerId: string, validFrom = Date.now(), validUntil?: number): void {
    const unit = this.units.get(unitId);
    if (!unit) throw new Error(`Unknown OEM unit: ${unitId}`);
    this.units.set(unitId, { ...unit, activatedAt: validFrom });
    this.licensing.issue({
      id: `oem:${unit.oemId}:${unitId}`,
      customerId,
      product: "oem",
      scope: "oem-unit",
      scopeId: unitId,
      features: ["brain-runtime", "field-update", "qualification", "recovery"],
      validFrom,
      status: "active",
      ...(validUntil !== undefined ? { validUntil } : {}),
      metadata: {
        manufacturer: unit.manufacturer,
        model: unit.model,
        ...(unit.firmware !== undefined
          ? { firmware: unit.firmware }
          : {})
      }
    });
  }

  validate(unitId: string, feature: string, now = Date.now()) {
    return this.licensing.validate(unitId, feature, now);
  }

  list(): OEMUnit[] { return [...this.units.values()].map((unit) => ({ ...unit })); }
}
