import test from "node:test";
import assert from "node:assert/strict";
import {
  ECA1Brain,
  PhysicalAuthorization,
  UniversalPlatformRegistry,
  type CandidateAction,
  type ClearanceDecision,
  type PlatformAdapter
} from "../src/index.js";

function mockPlatform(id: string): PlatformAdapter {
  return {
    id,
    async capabilities() {
      return [{ id: "move", description: "Move platform", maxLatencyMs: 20 }];
    },
    async sense() {
      return [
        {
          source: `${id}:position`,
          kind: "position",
          timestamp: Date.now(),
          data: { x: 0 },
          confidence: 1,
          health: "nominal"
        }
      ];
    },
    async snapshot() {
      return {
        timestamp: Date.now(),
        body: { speed: 0 },
        world: { restricted: false },
        mission: { authorized: true },
        health: { emergencyStop: false }
      };
    },
    async execute(_action: CandidateAction, clearance: ClearanceDecision) {
      assert.equal(clearance.allowed, true);
      return {
        accepted: true,
        completed: true,
        timestamp: Date.now(),
        outcome: { moved: true }
      };
    },
    async emergencyStop() {}
  };
}

const authorization = new PhysicalAuthorization({
  authority: "test-authority",
  ttlMs: 1000,
  evaluate(_action, state) {
    const reasons: string[] = [];
    if (state.health.emergencyStop === true) reasons.push("emergency-stop-active");
    if (state.world.restricted === true) reasons.push("restricted-zone");
    if (state.mission.authorized !== true) reasons.push("mission-not-authorized");
    return reasons;
  }
});

test("same ECA-1 core executes through different robot adapters", async () => {
  const brain = new ECA1Brain(authorization);
  const registry = new UniversalPlatformRegistry();
  const arm = mockPlatform("industrial-arm");
  const drone = mockPlatform("aerial-platform");
  registry.register(arm);
  registry.register(drone);

  const action = (): CandidateAction => ({
    id: crypto.randomUUID(),
    capability: "move",
    command: { target: 1 },
    reason: "test",
    confidence: 0.99,
    createdAt: Date.now()
  });

  const armResult = await brain.cycle(arm, () => action());
  const droneResult = await brain.cycle(drone, () => action());

  assert.equal(armResult.actuation?.completed, true);
  assert.equal(droneResult.actuation?.completed, true);
  assert.equal(registry.list().length, 2);
  assert.ok(brain.memory.all().length >= 6);
});

test("candidate action cannot bypass physical authorization", async () => {
  const brain = new ECA1Brain(authorization);
  const platform = mockPlatform("unsafe-test");
  const state = await platform.snapshot();
  state.health.emergencyStop = true;

  await assert.rejects(
    brain.execute(platform, state, {
      id: crypto.randomUUID(),
      capability: "move",
      command: { target: 1 },
      reason: "should be denied",
      confidence: 1,
      createdAt: Date.now()
    }),
    /emergency-stop-active/
  );

  assert.equal(brain.memory.latest("clearance:denied")?.kind, "clearance:denied");
});
