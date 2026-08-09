import test from "node:test";
import assert from "node:assert/strict";
import {
  CausalHypothesisManager,
  DiagnosticPlanner,
  DiscrepancyEngine,
  ExpectationModel,
  RecoveryBudget,
  type CandidateAction
} from "../src/index.js";

function action(id: string): CandidateAction {
  return {
    id,
    capability: "diagnose",
    command: { test: id },
    reason: "diagnostic discrimination",
    confidence: 0.9,
    createdAt: Date.now()
  };
}

test("expectation model exposes only out-of-tolerance physical residuals", () => {
  const expectations = new ExpectationModel();
  expectations.set({
    id: "insert-1",
    platformId: "arm",
    createdAt: Date.now(),
    values: [
      { key: "clearance_um", value: 0, tolerance: 10, confidence: 1, source: "mission" },
      { key: "fixture_locked", value: true, confidence: 1, source: "fixture" }
    ]
  });

  const residuals = expectations.meaningfulResiduals("insert-1", {
    clearance_um: 48,
    fixture_locked: true
  });

  assert.equal(residuals.length, 1);
  assert.equal(residuals[0]?.key, "clearance_um");
  assert.equal(residuals[0]?.withinTolerance, false);
});

test("diagnostic planner prefers informative bounded actions", () => {
  const discrepancies = new DiscrepancyEngine();
  const discrepancy = discrepancies.detect(
    { clearance_um: 0 },
    { clearance_um: 48 },
    48,
    0.1,
    ["thermal", "fixture", "sensor"],
    "medium"
  );
  assert.ok(discrepancy);

  const hypotheses = new CausalHypothesisManager();
  hypotheses.propose({ id: "thermal", explanation: "thermal expansion", confidence: 0.5, evidenceFor: [], evidenceAgainst: [], status: "active" });
  hypotheses.propose({ id: "fixture", explanation: "fixture movement", confidence: 0.4, evidenceFor: [], evidenceAgainst: [], status: "active" });

  const planner = new DiagnosticPlanner();
  const plan = planner.select(discrepancy, hypotheses.ranked(), [
    { id: "measure-temp", action: action("measure-temp"), testsHypotheses: ["thermal"], expectedInformationGain: 0.9, estimatedRisk: 0.05, estimatedCost: 0.05 },
    { id: "force-retry", action: action("force-retry"), testsHypotheses: ["fixture"], expectedInformationGain: 0.4, estimatedRisk: 0.7, estimatedCost: 0.1 }
  ], { maxRisk: 0.2, maxCost: 0.5 });

  assert.equal(plan.selected?.id, "measure-temp");
  assert.equal(plan.rejected.some((item) => item.candidateId === "force-retry"), true);
});

test("recovery budget prevents endless retries", () => {
  const budget = new RecoveryBudget({
    maxAttempts: 2,
    maxElapsedMs: 10_000,
    maxCumulativeRisk: 1,
    maxCumulativeCost: 1
  }, 1_000);

  budget.consume(0.2, 0.2, 1_100);
  budget.consume(0.2, 0.2, 1_200);

  const blocked = budget.canAttempt(0.1, 0.1, 1_300);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.reasons.includes("attempt-limit"), true);
});
