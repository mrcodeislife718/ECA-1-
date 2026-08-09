import test from "node:test";
import assert from "node:assert/strict";
import {
  UniversalEmbodimentRuntime,
  MultiTimescaleScheduler,
  DamageDegradationAccumulator,
  type CandidateAction,
  type ClearanceDecision,
  type PlatformAdapter
} from "../src/index.js";

function platform(id: string, capability = "move"): PlatformAdapter {
  return {
    id,
    async capabilities() { return [{ id: capability, description: capability, maxLatencyMs: 20 }]; },
    async sense() { return [{ source: `${id}:pose`, kind: "pose", timestamp: Date.now(), data: { x: 0 }, confidence: 1, health: "nominal" }]; },
    async snapshot() { return { timestamp: Date.now(), body: { stable: true }, world: { clear: true }, mission: { authorized: true }, health: { ok: true } }; },
    async execute(_action: CandidateAction, _clearance: ClearanceDecision) { return { accepted: true, completed: true, timestamp: Date.now(), outcome: { ok: true } }; },
    async emergencyStop() {}
  };
}

test("runtime refuses unqualified capability then admits current evidence-backed qualification", async () => {
  const runtime = new UniversalEmbodimentRuntime();
  const robot = platform("arm");
  const now = Date.now();
  const facts = [{ key: "body.stable", value: true, timestamp: now, confidence: 1, source: "arm" }];

  const denied = await runtime.assess(robot, [{ capability: "move", required: true }], facts, now);
  assert.equal(denied.ready, false);
  assert.ok(denied.reasons.some((reason) => reason.includes("qualification-missing")));

  runtime.qualifications.put({
    capability: "move", platformId: "arm", evidenceIds: ["e1"], confidence: 0.95,
    validFrom: now - 1, validUntil: now + 1000, status: "qualified", maxLatencyMs: 20
  });
  const ready = await runtime.assess(robot, [{ capability: "move", required: true }], facts, now);
  assert.equal(ready.ready, true);
});

test("stale or contradictory state blocks transition commit and permits rollback", async () => {
  const runtime = new UniversalEmbodimentRuntime();
  const robot = platform("drone");
  const now = Date.now();
  runtime.qualifications.put({ capability: "move", platformId: "drone", evidenceIds: ["e2"], confidence: 0.9, validFrom: now - 1, validUntil: now + 1000, status: "qualified" });
  const source = { platformId: "arm", mission: { id: "m1" }, world: { target: "A" }, authority: { operator: "x" }, transferableLearning: { skill: "navigate" } };
  const target = { ...source, platformId: "drone" };
  runtime.prepareTransition(source, target);

  const readiness = await runtime.assess(robot, [{ key: "world.clear", value: true, timestamp: now - 1000, confidence: 1, source: "old" }], now);
  assert.equal(readiness.ready, false);
  assert.throws(() => runtime.commitTransition(readiness));
  assert.equal(runtime.rollbackTransition().platformId, "arm");
});

test("multi-timescale scheduler protects fast loops and degradation accumulates hidden wear", async () => {
  const scheduler = new MultiTimescaleScheduler();
  const order: string[] = [];
  const now = Date.now();
  scheduler.enqueue({ id: "learn", loop: "learning", deadlineMs: 1000, createdAt: now, run: () => { order.push("learn"); } });
  scheduler.enqueue({ id: "reflex", loop: "reflex", deadlineMs: 20, createdAt: now, run: () => { order.push("reflex"); } });
  await scheduler.runNext(now);
  assert.deepEqual(order, ["reflex"]);

  const degradation = new DamageDegradationAccumulator();
  for (let i = 0; i < 6; i += 1) degradation.ingest({ component: "joint-1", kind: "wear", severity: 1, confidence: 1, timestamp: now + i, source: "monitor" });
  assert.equal(degradation.state("joint-1").status, "degraded");
});

test("same conformance contract evaluates materially different embodiments", async () => {
  const runtime = new UniversalEmbodimentRuntime();
  const results = await runtime.conformance.verifyMany([platform("industrial-arm"), platform("aerial-platform"), platform("mobile-base")]);
  assert.equal(results.length, 3);
  assert.ok(results.every((result) => result.passed));
});
