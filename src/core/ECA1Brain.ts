import { randomUUID } from "node:crypto";
import type {
  ActuationResult,
  CandidateAction,
  EvidenceRecord,
  PlatformAdapter,
  RobotState,
  SensorObservation
} from "../contracts.js";
import { EvidenceMemory } from "../memory/EvidenceMemory.js";
import { PhysicalAuthorization } from "../governance/PhysicalAuthorization.js";
import { BodyWorldState } from "../state/PersistentStateModels.js";
import { SensorFusionConfidence, type FusedObservation } from "../perception/SensorFusionConfidence.js";
import { AttentionRouter, type RoutedSignal } from "../cognition/AttentionRouter.js";
import { LocalReflexPath, type ReflexDecision } from "../runtime/LocalReflexPath.js";

export type BrainCycleResult = {
  platformId: string;
  state: RobotState;
  observations: SensorObservation[];
  fused: FusedObservation[];
  routed: RoutedSignal[];
  reflex: ReflexDecision;
  action?: CandidateAction;
  actuation?: ActuationResult;
};

export class ECA1Brain {
  readonly memory = new EvidenceMemory();
  readonly continuity = new BodyWorldState();
  readonly fusion = new SensorFusionConfidence();
  readonly attention = new AttentionRouter();
  readonly reflex = new LocalReflexPath();

  constructor(private readonly authorization: PhysicalAuthorization) {}

  async observe(platform: PlatformAdapter): Promise<BrainCycleResult> {
    const [observations, state] = await Promise.all([platform.sense(), platform.snapshot()]);
    this.continuity.ingestState(state, platform.id);
    this.continuity.ingestObservations(observations);
    const fused = this.fusion.fuse(observations);
    const routed = this.attention.route(observations);
    const reflex = this.reflex.evaluate(observations);

    for (const observation of observations) {
      this.remember({
        kind: `sensor:${observation.kind}`,
        source: observation.source,
        payload: observation,
        confidence: observation.confidence,
        provenance: [platform.id]
      });
    }

    this.remember({
      kind: "state:snapshot",
      source: platform.id,
      payload: state,
      confidence: 1,
      provenance: [platform.id]
    });

    if (reflex.triggered) {
      this.remember({
        kind: `reflex:${reflex.action}`,
        source: "local-reflex-path",
        payload: reflex,
        confidence: 1,
        provenance: [platform.id]
      });
      if (reflex.action === "emergency-stop") await platform.emergencyStop(reflex.reason ?? "ECA-1 reflex emergency stop");
    }

    return { platformId: platform.id, state, observations, fused, routed, reflex };
  }

  async execute(platform: PlatformAdapter, state: RobotState, action: CandidateAction): Promise<ActuationResult> {
    const capabilities = await platform.capabilities();
    if (!capabilities.some((capability) => capability.id === action.capability)) {
      throw new Error(`Platform ${platform.id} does not expose capability ${action.capability}`);
    }

    const clearance = this.authorization.clear(action, state);
    this.remember({
      kind: clearance.allowed ? "clearance:allowed" : "clearance:denied",
      source: "physical-authorization",
      payload: { action, clearance },
      confidence: 1,
      provenance: [platform.id, action.id]
    });

    this.authorization.assertFresh(clearance);
    const result = await platform.execute(action, clearance);

    this.remember({
      kind: "actuation:result",
      source: platform.id,
      payload: { action, result },
      confidence: result.completed ? 1 : 0.5,
      provenance: [platform.id, action.id]
    });

    return result;
  }

  async cycle(platform: PlatformAdapter, selectAction: (state: RobotState, observations: SensorObservation[]) => CandidateAction | undefined): Promise<BrainCycleResult> {
    const observed = await this.observe(platform);
    if (observed.reflex.triggered && observed.reflex.action !== "none") return observed;
    const action = selectAction(observed.state, observed.observations);
    if (!action) return observed;
    const actuation = await this.execute(platform, observed.state, action);
    return { ...observed, action, actuation };
  }

  private remember(record: Omit<EvidenceRecord, "id" | "timestamp">): void {
    this.memory.append({ id: randomUUID(), timestamp: Date.now(), ...record });
  }
}
