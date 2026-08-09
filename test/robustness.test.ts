import test from "node:test";
import assert from "node:assert/strict";
import {
  AdaptiveResourceGovernor,
  AssumptionLedger,
  EdgeCaseMatrix,
  FaultInjectionHarness,
  InvariantEngine,
  UnknownUnknownsEngine,
  WatchdogSupervisor
} from "../src/index.js";

test("unknown-unknowns engine challenges hidden assumptions and dependencies", () => {
  const engine = new UnknownUnknownsEngine();
  const questions = engine.generate({
    dependencies: ["camera", "power"],
    assumptions: ["fixture-is-stationary"]
  });
  assert.ok(questions.some((q) => q.id === "sensor-truth"));
  assert.ok(questions.some((q) => q.id === "dependency:camera"));
  assert.ok(questions.some((q) => q.id === "assumption:fixture-is-stationary"));
});

test("invariants block unsafe state", () => {
  const invariants = new InvariantEngine([
    {
      id: "no-motion-with-estop",
      description: "Motion cannot be authorized while emergency stop is active",
      severity: "emergency",
      evaluate: (state) => state.emergencyStop !== true
    }
  ]);
  assert.throws(() => invariants.assertSafe({ emergencyStop: true }), /no-motion-with-estop/);
});

test("watchdog detects stale execution path", () => {
  const watchdog = new WatchdogSupervisor();
  watchdog.register("motion-loop", 10, 1000);
  assert.equal(watchdog.missed(1005).length, 0);
  assert.equal(watchdog.missed(1011)[0]?.id, "motion-loop");
});

test("fault injection exposes expected fail-safe behavior", () => {
  const harness = new FaultInjectionHarness();
  const results = harness.run(
    { sensorHealthy: true },
    [{
      id: "sensor-blackout",
      category: "sensor",
      description: "Primary sensor disappears",
      severity: "critical",
      inject: (state) => ({ ...state, sensorHealthy: false }),
      expectedResponse: "safe-state"
    }],
    (state) => state.sensorHealthy === false ? "safe-state" : "continue"
  );
  assert.equal(results[0]?.passed, true);
});

test("resource governor protects safety-critical demand under pressure", () => {
  const governor = new AdaptiveResourceGovernor();
  const result = governor.allocate([
    { id: "safety", priority: 0, compute: 5, memory: 5, bandwidth: 1, deadlineMs: 2, safetyCritical: true },
    { id: "analytics", priority: 5, compute: 10, memory: 10, bandwidth: 5, deadlineMs: 1000, safetyCritical: false }
  ], { compute: 8, memory: 8, bandwidth: 2 });
  assert.deepEqual(result.admitted, ["safety"]);
  assert.deepEqual(result.deferred, ["analytics"]);
});

test("edge-case matrix exposes coverage gaps instead of hiding them", () => {
  const matrix = new EdgeCaseMatrix();
  matrix.add({ id: "sensor-fail", dimensions: ["sensor", "recovery"], description: "sensor fails", tested: true, passed: true });
  const gaps = matrix.gaps();
  assert.ok(gaps.includes("security"));
  assert.ok(!gaps.includes("sensor"));
});

test("assumption ledger keeps unverified beliefs visible", () => {
  const ledger = new AssumptionLedger();
  ledger.add({ id: "fixture", statement: "fixture remains fixed", status: "unverified", evidenceIds: [], confidence: 0.5, createdAt: 1 });
  assert.equal(ledger.unresolved().length, 1);
  ledger.mark("fixture", "supported", "evidence-1", 0.9);
  assert.equal(ledger.unresolved().length, 0);
});
