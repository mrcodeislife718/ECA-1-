import test from "node:test";
import assert from "node:assert/strict";
import {
  AutonomousRecoveryOrchestrator,
  DiagnosticPlanner,
  RecoveryBudget,
  type CausalHypothesis,
  type DiagnosticCandidate,
  type Discrepancy,
  type EightNodeAnalysis
} from "../src/index.js";

const discrepancy: Discrepancy = {
  id: "clearance-48um",
  expected: { clearanceUm: 0 },
  observed: { clearanceUm: 48 },
  magnitude: 48,
  uncertainty: 0.2,
  hypotheses: ["thermal-expansion", "fixture-shift"],
  hazard: "medium",
  createdAt: Date.now()
};

const hypotheses: CausalHypothesis[] = [
  {
    id: "thermal-expansion",
    explanation: "Temperature changed the effective dimension",
    confidence: 0.5,
    evidenceFor: [],
    evidenceAgainst: [],
    status: "active"
  },
  {
    id: "fixture-shift",
    explanation: "Fixture moved from calibrated pose",
    confidence: 0.5,
    evidenceFor: [],
    evidenceAgainst: [],
    status: "active"
  }
];

const candidates: DiagnosticCandidate[] = [
  {
    id: "remeasure-temperature",
    action: {
      id: "action-temp",
      capability: "measure-temperature",
      command: {},
      reason: "discriminate thermal expansion from fixture shift",
      confidence: 0.95,
      createdAt: Date.now()
    },
    testsHypotheses: ["thermal-expansion"],
    expectedInformationGain: 0.9,
    estimatedRisk: 0.05,
    estimatedCost: 0.05
  }
];

const eightNodes: EightNodeAnalysis = {
  input: ["temperature reading may be stale"],
  process: ["thermal compensation may be missing"],
  output: ["clearance differs from expected state"],
  feedback: ["fixture remeasurement not yet performed"],
  incentives: ["production pressure must not override safety"],
  bottlenecks: ["diagnostic measurement latency"],
  dependencies: ["temperature sensor", "metrology capability"],
  failurePoints: ["wrong causal classification could cause damaging retry"]
};

test("closed-loop recovery applies the 8-node framework to an obstruction", async () => {
  const orchestrator = new AutonomousRecoveryOrchestrator(
    new DiagnosticPlanner(),
    new RecoveryBudget({
      maxAttempts: 3,
      maxElapsedMs: 10_000,
      maxCumulativeRisk: 1,
      maxCumulativeCost: 1
    }),
    {
      async executeDiagnostic(candidate) {
        assert.equal(candidate.id, "remeasure-temperature");
        return {
          evidenceId: "temperature-evidence-1",
          supports: ["thermal-expansion"],
          contradicts: ["fixture-shift"],
          resolved: true,
          stable: true
        };
      }
    }
  );

  orchestrator.seedHypotheses(hypotheses);
  const result = await orchestrator.recover(
    discrepancy,
    candidates,
    { maxRisk: 0.2, maxCost: 0.2 },
    eightNodes
  );

  assert.equal(result.state, "resume");
  assert.equal(result.plan?.selected?.id, "remeasure-temperature");
  assert.equal(result.obstruction?.blockingNodes.length, 8);
  assert.ok(result.obstruction?.recommendedChecks.includes("verify-required-capability"));
  const topHypothesis = orchestrator.hypotheses.ranked()[0];
  assert.ok(topHypothesis);
  assert.ok(topHypothesis.confidence > 0.5);
});

test("critical obstruction goes directly to safe state", async () => {
  const critical = { ...discrepancy, hazard: "critical" as const, id: "critical-obstruction" };
  const orchestrator = new AutonomousRecoveryOrchestrator(
    new DiagnosticPlanner(),
    new RecoveryBudget({
      maxAttempts: 1,
      maxElapsedMs: 1000,
      maxCumulativeRisk: 0.1,
      maxCumulativeCost: 0.1
    }),
    { async executeDiagnostic() { throw new Error("must not execute"); } }
  );
  orchestrator.seedHypotheses(hypotheses);
  const result = await orchestrator.recover(critical, candidates, { maxRisk: 0.1, maxCost: 0.1 }, eightNodes);
  assert.equal(result.state, "safe-state");
});
