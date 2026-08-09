import type { PlatformAdapter } from "../contracts.js";
import { LicensingEngine } from "../commercial/LicensingEngine.js";

export type FleetMember = {
  robotId: string;
  siteId: string;
  adapter: PlatformAdapter;
  enrolledAt: number;
  status: "active" | "degraded" | "maintenance" | "offline";
};

export class FleetControlPlane {
  private readonly members = new Map<string, FleetMember>();
  constructor(readonly licensing = new LicensingEngine()) {}

  enroll(member: FleetMember): void {
    this.members.set(member.robotId, { ...member });
  }

  setStatus(robotId: string, status: FleetMember["status"]): void {
    const current = this.members.get(robotId);
    if (!current) throw new Error(`Unknown robot: ${robotId}`);
    this.members.set(robotId, { ...current, status });
  }

  operational(siteId?: string): FleetMember[] {
    return [...this.members.values()]
      .filter((member) => member.status === "active" && (siteId === undefined || member.siteId === siteId))
      .map((member) => ({ ...member }));
  }

  siteSummary(siteId: string): { total: number; active: number; degraded: number; maintenance: number; offline: number } {
    const fleet = [...this.members.values()].filter((member) => member.siteId === siteId);
    return {
      total: fleet.length,
      active: fleet.filter((member) => member.status === "active").length,
      degraded: fleet.filter((member) => member.status === "degraded").length,
      maintenance: fleet.filter((member) => member.status === "maintenance").length,
      offline: fleet.filter((member) => member.status === "offline").length
    };
  }

  requireSiteFeature(siteId: string, feature: string, now = Date.now()): void {
    const entitlement = this.licensing.validate(siteId, feature, now);
    if (!entitlement.allowed) throw new Error(`Fleet feature ${feature} unavailable for ${siteId}: ${entitlement.reasons.join(",")}`);
  }
}
