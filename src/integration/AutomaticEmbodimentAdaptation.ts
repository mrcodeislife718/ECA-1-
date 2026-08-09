import type { PlatformAdapter, SensorObservation } from "../contracts.js";
import { EmbodimentHandshake, type EmbodimentProfile } from "./EmbodimentHandshake.js";

export type DegreeOfFreedom = {
  id: string;
  kind: "linear" | "rotational" | "discrete" | "unknown";
  controllable: boolean;
  observedRange?: [number, number];
  confidence: number;
};

export type CapabilityGraphNode = {
  capability: string;
  dependencies: string[];
  qualified: boolean;
  confidence: number;
};

export type PhysicalEnvelope = {
  latencyMs: Record<string, number>;
  force: Record<string, number>;
  energy: Record<string, number>;
  qualifiedAt: number;
};

export type CalibrationExperiment = {
  id: string;
  capability: string;
  purpose: string;
  maxRisk: number;
  expectedInformationGain: number;
};

export type AdaptationReport = {
  platformId: string;
  profile: EmbodimentProfile;
  degreesOfFreedom: DegreeOfFreedom[];
  capabilityGraph: CapabilityGraphNode[];
  proposedExperiments: CalibrationExperiment[];
  envelope: PhysicalEnvelope;
  status: "blocked" | "discovery" | "calibrating" | "qualified" | "degraded";
  blockers: string[];
};

/**
 * Builds an initial machine-understandable model of a new embodiment without
 * binding cognition to a vendor or body type. Qualification remains evidence-
 * driven: inferred capabilities are not treated as physically validated until
 * calibration and deployment evidence support them.
 */
export class AutomaticEmbodimentAdaptation {
  private readonly handshake = new EmbodimentHandshake();

  async discover(platform: PlatformAdapter): Promise<AdaptationReport> {
    const [profile, observations] = await Promise.all([
      this.handshake.profile(platform),
      platform.sense()
    ]);

    const degreesOfFreedom = this.inferDegreesOfFreedom(observations);
    const capabilityGraph = profile.capabilities.map((capability) => ({
      capability: capability.id,
      dependencies: [],
      qualified: false,
      confidence: 0.5
    }));

    const proposedExperiments = profile.capabilities.map((capability) => ({
      id: `calibrate:${capability.id}`,
      capability: capability.id,
      purpose: `Establish safe operating evidence for ${capability.id}`,
      maxRisk: 0.1,
      expectedInformationGain: 0.8
    }));

    const latencyMs = Object.fromEntries(
      profile.capabilities.map((capability) => [capability.id, capability.maxLatencyMs])
    );

    const blockers = [...profile.blockers];
    if (profile.capabilities.length === 0) blockers.push("no-capabilities-discovered");

    return {
      platformId: platform.id,
      profile,
      degreesOfFreedom,
      capabilityGraph,
      proposedExperiments,
      envelope: {
        latencyMs,
        force: {},
        energy: {},
        qualifiedAt: Date.now()
      },
      status: blockers.length > 0 ? "blocked" : "discovery",
      blockers
    };
  }

  qualifyCapability(
    report: AdaptationReport,
    capability: string,
    evidence: { confidence: number; latencyMs?: number; maxForce?: number; maxEnergy?: number }
  ): AdaptationReport {
    const node = report.capabilityGraph.find((item) => item.capability === capability);
    if (!node) throw new Error(`Unknown capability ${capability}`);

    const confidence = Math.max(0, Math.min(1, evidence.confidence));
    const capabilityGraph = report.capabilityGraph.map((item) =>
      item.capability === capability
        ? { ...item, qualified: confidence >= 0.8, confidence }
        : item
    );

    const envelope: PhysicalEnvelope = {
      latencyMs: {
        ...report.envelope.latencyMs,
        ...(evidence.latencyMs === undefined ? {} : { [capability]: evidence.latencyMs })
      },
      force: {
        ...report.envelope.force,
        ...(evidence.maxForce === undefined ? {} : { [capability]: evidence.maxForce })
      },
      energy: {
        ...report.envelope.energy,
        ...(evidence.maxEnergy === undefined ? {} : { [capability]: evidence.maxEnergy })
      },
      qualifiedAt: Date.now()
    };

    const allQualified = capabilityGraph.every((item) => item.qualified);
    return {
      ...report,
      capabilityGraph,
      envelope,
      status: allQualified ? "qualified" : "calibrating"
    };
  }

  private inferDegreesOfFreedom(observations: SensorObservation[]): DegreeOfFreedom[] {
    const inferred: DegreeOfFreedom[] = [];
    for (const observation of observations) {
      if (!observation.kind.includes("position") && !observation.kind.includes("joint") && !observation.kind.includes("pose")) continue;
      if (typeof observation.data !== "object" || observation.data === null) continue;
      for (const [key, value] of Object.entries(observation.data as Record<string, unknown>)) {
        if (typeof value !== "number") continue;
        inferred.push({
          id: `${observation.kind}:${key}`,
          kind: key.toLowerCase().includes("angle") || key.toLowerCase().includes("yaw") || key.toLowerCase().includes("pitch") || key.toLowerCase().includes("roll") ? "rotational" : "linear",
          controllable: true,
          confidence: observation.confidence
        });
      }
    }
    return inferred;
  }
}
