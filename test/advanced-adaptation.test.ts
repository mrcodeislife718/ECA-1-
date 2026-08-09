import test from "node:test";
import assert from "node:assert/strict";
import {
  AutomaticCalibrationPlanner,
  CapabilityNegotiationEngine,
  EdgeCaseAdaptationSupervisor,
  EmbodimentContinuityManager,
  HotSwapCoordinator,
  UncertaintyPropagation
} from "../src/adaptation/index.js";

test("preserves mission continuity while dropping body-specific assumptions", () => {
  const manager = new EmbodimentContinuityManager();
  const transfer = manager.transfer({
    mission: { id: "mission-1" },
    world: { fixture: "known" },
    authority: { operator: "valid" },
    transferableLearning: { insertion: "learned" },
    bodySpecific: { jointMap: [1, 2, 3], wheelbase: 0.5 },
    capturedAt: Date.now()
  });
  assert.equal(transfer.preserved.mission.id, "mission-1");
  assert.deepEqual(transfer.discardedBodySpecificKeys.sort(), ["jointMap", "wheelbase"]);
});

test("blocks mission when required capability cannot meet latency", () => {
  const engine = new CapabilityNegotiationEngine();
  const requirements = [{ id: "stabilize", required: true, maxLatencyMs: 20 }];
  const result = engine.negotiate([{ id: "stabilize", description: "stabilize", maxLatencyMs: 40 }], requirements);
  assert.equal(result[0]?.status, "too-slow");
  assert.equal(engine.missionReady(result, requirements), false);
});

test("propagates uncertainty instead of hiding weak evidence", () => {
  const uncertainty = new UncertaintyPropagation();
  const combined = uncertainty.combine([
    { value: 1, confidence: 0.9, sources: ["camera"], updatedAt: Date.now() },
    { value: 1, confidence: 0.6, sources: ["force"], updatedAt: Date.now() }
  ]);
  assert.ok(combined.confidence < 0.9);
  assert.equal(uncertainty.decisionBand(combined.confidence), "uncertain");
});

test("critical unknown edge case enters safe state", () => {
  const supervisor = new EdgeCaseAdaptationSupervisor();
  const decision = supervisor.decide([{ kind: "unknown", severity: "critical", confidence: 0.1, description: "unmodeled hazard", timestamp: Date.now() }]);
  assert.equal(decision.mode, "safe-state");
});

test("calibration planner prefers information-rich probes within budgets", () => {
  const planner = new AutomaticCalibrationPlanner();
  const plan = planner.plan([
    { id: "probe-a", target: "joint-a", informationGain: 0.9, risk: 0.1, energyCost: 0.1, durationMs: 100, prerequisites: ["clear-zone"] },
    { id: "probe-b", target: "joint-b", informationGain: 0.4, risk: 0.8, energyCost: 0.5, durationMs: 1000, prerequisites: ["clear-zone"] }
  ], { maxRisk: 0.2, maxEnergy: 0.3, maxDurationMs: 500, availablePrerequisites: ["clear-zone"] });
  assert.equal(plan.selected[0]?.id, "probe-a");
  assert.equal(plan.rejected.some((item) => item.id === "probe-b"), true);
});

test("hot swap pauses for requalification instead of blindly transferring", () => {
  const coordinator = new HotSwapCoordinator();
  const decision = coordinator.decide({
    fromPlatform: "arm",
    toPlatform: "drone",
    missionId: "mission-1",
    transferableCapabilities: ["observe"],
    requalificationRequired: ["move"],
    authorityValid: true,
    worldStateFresh: true
  });
  assert.equal(decision.allowed, true);
  assert.equal(decision.mode, "pause-and-qualify");
});
