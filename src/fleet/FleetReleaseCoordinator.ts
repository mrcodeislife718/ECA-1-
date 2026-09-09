export type FleetReleaseState = "pending" | "deploying" | "healthy" | "failed" | "rolled-back";

export type FleetReleaseTarget = {
  robotId: string;
  version: string;
  previousVersion?: string;
  state: FleetReleaseState;
  updatedAt: number;
  reason?: string;
};

export class FleetReleaseCoordinator {
  private readonly targets = new Map<string, FleetReleaseTarget>();

  plan(robotId: string, version: string, currentVersion: string | undefined, now = Date.now()): void {
    if (!robotId.trim() || !version.trim()) throw new Error("robotId and version are required");
    const existing = this.targets.get(robotId);
    if (existing && (existing.state === "pending" || existing.state === "deploying")) {
      throw new Error(`Release already active for ${robotId}`);
    }
    this.targets.set(robotId, {
      robotId,
      version,
      ...(currentVersion ? { previousVersion: currentVersion } : {}),
      state: "pending",
      updatedAt: now
    });
  }

  markDeploying(robotId: string, now = Date.now()): void {
    this.transition(robotId, "deploying", now);
  }

  markHealthy(robotId: string, now = Date.now()): void {
    this.transition(robotId, "healthy", now);
  }

  markFailed(robotId: string, reason: string, now = Date.now()): void {
    const current = this.require(robotId);
    if (current.state !== "deploying" && current.state !== "pending") {
      throw new Error(`Cannot fail release for ${robotId} from ${current.state}`);
    }
    this.targets.set(robotId, { ...current, state: "failed", reason, updatedAt: now });
  }

  rollback(robotId: string, now = Date.now()): string {
    const current = this.require(robotId);
    if (current.state !== "failed") throw new Error(`Rollback requires failed release for ${robotId}`);
    if (!current.previousVersion) throw new Error(`No rollback version recorded for ${robotId}`);
    this.targets.set(robotId, { ...current, state: "rolled-back", updatedAt: now });
    return current.previousVersion;
  }

  status(robotId: string): FleetReleaseTarget | undefined {
    const current = this.targets.get(robotId);
    return current ? { ...current } : undefined;
  }

  list(state?: FleetReleaseState): FleetReleaseTarget[] {
    return [...this.targets.values()]
      .filter((target) => state === undefined || target.state === state)
      .map((target) => ({ ...target }));
  }

  private transition(robotId: string, next: FleetReleaseState, now: number): void {
    const current = this.require(robotId);
    const allowed =
      (current.state === "pending" && next === "deploying") ||
      (current.state === "deploying" && next === "healthy");
    if (!allowed) throw new Error(`Invalid release transition ${current.state} -> ${next} for ${robotId}`);
    this.targets.set(robotId, { ...current, state: next, updatedAt: now });
  }

  private require(robotId: string): FleetReleaseTarget {
    const current = this.targets.get(robotId);
    if (!current) throw new Error(`Unknown fleet release target: ${robotId}`);
    return current;
  }
}
