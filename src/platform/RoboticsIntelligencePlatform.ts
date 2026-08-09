import { UniversalAutoIntegration, type AutoIntegrationReport, type DriverFactory } from "../integration/UniversalAutoIntegration.js";
import { UseCaseDeploymentPackBuilder, type UseCaseDeploymentPack } from "../integration/UseCaseDeploymentPack.js";
import type { UseCaseProfile } from "../integration/UseCaseProfile.js";
import { TimeToQualifiedWork, type TQWReport } from "../metrics/TimeToQualifiedWork.js";
import { LicensingEngine } from "../commercial/LicensingEngine.js";

export type PlatformSession = {
  id: string;
  customerId: string;
  robotInput: unknown;
  integration?: AutoIntegrationReport;
  useCase?: UseCaseDeploymentPack;
  tqw: TimeToQualifiedWork;
  status: "created" | "connected" | "needs-input" | "needs-calibration" | "qualified" | "mission-ready" | "blocked";
  blockers: string[];
};

/**
 * Customer-facing ECA-1 product surface. The customer supplies a robot and the
 * work they need done; this orchestrator connects integration discovery,
 * use-case edge-case generation, qualification progress, entitlement, and TQW.
 */
export class RoboticsIntelligencePlatform {
  readonly integration = new UniversalAutoIntegration();
  readonly useCases = new UseCaseDeploymentPackBuilder();
  readonly licensing = new LicensingEngine();
  private readonly sessions = new Map<string, PlatformSession>();

  registerDriverFactory(factory: DriverFactory): void { this.integration.registerFactory(factory); }

  createSession(id: string, customerId: string, robotInput: unknown, now = Date.now()): PlatformSession {
    if (this.sessions.has(id)) throw new Error(`Session already exists: ${id}`);
    const tqw = new TimeToQualifiedWork();
    tqw.mark({ milestone: "connected", timestamp: now });
    const session: PlatformSession = { id, customerId, robotInput, tqw, status: "created", blockers: [] };
    this.sessions.set(id, session);
    return session;
  }

  async connect(sessionId: string, now = Date.now()): Promise<PlatformSession> {
    const session = this.require(sessionId);
    const report = await this.integration.connect(session.robotInput);
    session.integration = report;
    session.tqw.mark({ milestone: "discovered", timestamp: now });
    session.tqw.mark({ milestone: "integrated", timestamp: now });
    session.blockers = [...report.unknowns];
    if (report.status === "blocked") session.status = "blocked";
    else if (report.status === "needs-calibration") session.status = "needs-calibration";
    else session.status = "connected";
    return session;
  }

  configureUseCase(sessionId: string, profile: UseCaseProfile): PlatformSession {
    const session = this.require(sessionId);
    const pack = this.useCases.build(profile);
    session.useCase = pack;
    session.blockers = [...new Set([...session.blockers, ...pack.unresolvedQuestions])];
    if (pack.unresolvedQuestions.length > 0 && session.status !== "blocked") session.status = "needs-input";
    return session;
  }

  markCalibrated(sessionId: string, timestamp = Date.now()): void {
    const session = this.require(sessionId);
    session.tqw.mark({ milestone: "calibrated", timestamp });
    if (session.status !== "blocked") session.status = "needs-calibration";
  }

  markQualified(sessionId: string, timestamp = Date.now()): void {
    const session = this.require(sessionId);
    if (!session.integration) throw new Error("Robot must be integrated before qualification");
    if (!session.useCase) throw new Error("Use case must be configured before qualification");
    if (session.blockers.length > 0) throw new Error(`Cannot qualify with blockers: ${session.blockers.join(" | ")}`);
    session.tqw.mark({ milestone: "qualified", timestamp });
    session.status = "qualified";
  }

  markMissionReady(sessionId: string, timestamp = Date.now()): void {
    const session = this.require(sessionId);
    if (session.status !== "qualified") throw new Error("Session must be qualified before mission-ready");
    session.tqw.mark({ milestone: "mission-ready", timestamp });
    session.status = "mission-ready";
  }

  markUsefulWorkStarted(sessionId: string, timestamp = Date.now()): TQWReport {
    const session = this.require(sessionId);
    if (session.status !== "mission-ready") throw new Error("Session must be mission-ready before useful work starts");
    session.tqw.mark({ milestone: "useful-work-started", timestamp });
    return session.tqw.report();
  }

  resolveBlocker(sessionId: string, blocker: string): void {
    const session = this.require(sessionId);
    session.blockers = session.blockers.filter((item) => item !== blocker);
  }

  get(sessionId: string): PlatformSession { return this.require(sessionId); }

  private require(id: string): PlatformSession {
    const session = this.sessions.get(id);
    if (!session) throw new Error(`Unknown platform session: ${id}`);
    return session;
  }
}
