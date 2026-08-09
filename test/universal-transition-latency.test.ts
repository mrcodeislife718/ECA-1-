import test from "node:test";
import assert from "node:assert/strict";
import {
  EmbodimentHandshake,
  EnvironmentEnvelope,
  FrictionlessTransitionCoordinator,
  HumanResponsiveLatency,
  UniversalSituationRouter,
  type CandidateAction,
  type ClearanceDecision,
  type PlatformAdapter
} from "../src/index.js";

function platform(id: string, capabilities: Array<{ id: string; description: string; maxLatencyMs: number; requiresUplink?: boolean }>): PlatformAdapter {
  return {
    id,
    async capabilities() { return capabilities; },
    async sense() { return []; },
    async snapshot() {
      return { timestamp: Date.now(), body: {}, world: {}, mission: {}, health: {} };
    },
    async execute(_action: CandidateAction, _clearance: ClearanceDecision) {
      return { accepted: true, completed: true, timestamp: Date.now(), outcome: {} };
    },
    async emergencyStop() {}
  };
}

test("human-responsive routing keeps critical response local and fast-classed", () => {
  const latency = new HumanResponsiveLatency();
  assert.equal(latency.classify(1, "critical"), "hardware-emergency");
  assert.equal(latency.classify(0.8, "medium"), "sensorimotor");
  assert.throws(() => latency.assertNoRemoteDependency("reflex", true), /cannot depend on remote/);
  assert.equal(latency.budget("sensorimotor").hardDeadlineMs, 120);
});

test("same mission context can transition between different embodiments", async () => {
  const arm = platform("arm", [
    { id: "move", description: "move", maxLatencyMs: 20 },
    { id: "inspect", description: "inspect", maxLatencyMs: 80 }
  ]);
  const drone = platform("drone", [
    { id: "move", description: "move", maxLatencyMs: 15 },
    { id: "inspect", description: "inspect", maxLatencyMs: 70 },
    { id: "fly", description: "fly", maxLatencyMs: 10 }
  ]);

  const handshake = new EmbodimentHandshake();
  const armProfile = await handshake.profile(arm);
  const droneProfile = await handshake.profile(drone);
  assert.deepEqual(handshake.sharedCapabilities(armProfile, droneProfile).sort(), ["inspect", "move"]);

  const transition = await new FrictionlessTransitionCoordinator(handshake).transition({
    from: { platform: arm, state: await arm.snapshot() },
    to: drone,
    requirements: [{ capability: "inspect", required: true, maxLatencyMs: 100 }],
    context: { missionId: "mission-1", mission: { objective: "inspect" }, world: { site: "A" } }
  });

  assert.equal(transition.ready, true);
  assert.equal(transition.preservedContext.missionId, "mission-1");
  assert.ok(transition.sharedCapabilities.includes("inspect"));
});

test("environment novelty and unsafe state route to appropriate response mode", () => {
  const safeEnvelope = new EnvironmentEnvelope([{ key: "temperature", min: -10, max: 60, critical: true }]);
  const novel = safeEnvelope.assess([]);
  const router = new UniversalSituationRouter();
  assert.equal(router.decide({ urgency: 0.3, environment: novel }).mode, "continue");

  const unsafe = safeEnvelope.assess([{
    source: "temp",
    kind: "temperature",
    timestamp: Date.now(),
    data: 100,
    confidence: 1,
    health: "nominal"
  }]);
  const decision = router.decide({ urgency: 1, environment: unsafe });
  assert.equal(decision.mode, "stop");
  assert.equal(decision.responseClass, "hardware-emergency");
});
