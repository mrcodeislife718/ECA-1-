import type { ProductId } from "./ProductCatalog.js";

export type LicenseScope = "robot" | "device" | "site" | "enterprise" | "oem-unit";
export type LicenseStatus = "active" | "expired" | "suspended" | "revoked" | "pending";

export type Entitlement = {
  id: string;
  customerId: string;
  product: ProductId;
  scope: LicenseScope;
  scopeId: string;
  features: string[];
  validFrom: number;
  validUntil?: number;
  status: LicenseStatus;
  metadata?: Record<string, unknown>;
};

export class LicensingEngine {
  private readonly entitlements = new Map<string, Entitlement>();

  issue(entitlement: Entitlement): void {
    if (entitlement.validUntil !== undefined && entitlement.validUntil <= entitlement.validFrom) {
      throw new Error("License validUntil must be after validFrom");
    }
    this.entitlements.set(entitlement.id, { ...entitlement, features: [...entitlement.features] });
  }

  validate(scopeId: string, feature: string, now = Date.now()): { allowed: boolean; reasons: string[]; entitlement?: Entitlement } {
    const candidates = [...this.entitlements.values()].filter((item) => item.scopeId === scopeId && item.features.includes(feature));
    const reasons: string[] = [];
    for (const item of candidates) {
      if (item.status !== "active") continue;
      if (now < item.validFrom) continue;
      if (item.validUntil !== undefined && now > item.validUntil) continue;
      return { allowed: true, reasons: [], entitlement: { ...item, features: [...item.features] } };
    }
    if (candidates.length === 0) reasons.push("entitlement-missing");
    else reasons.push("no-current-active-entitlement");
    return { allowed: false, reasons };
  }

  setStatus(id: string, status: LicenseStatus): void {
    const current = this.entitlements.get(id);
    if (!current) throw new Error(`Unknown entitlement: ${id}`);
    this.entitlements.set(id, { ...current, status });
  }

  list(customerId?: string): Entitlement[] {
    return [...this.entitlements.values()]
      .filter((item) => customerId === undefined || item.customerId === customerId)
      .map((item) => ({ ...item, features: [...item.features] }));
  }
}
