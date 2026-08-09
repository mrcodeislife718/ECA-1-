import test from "node:test";
import assert from "node:assert/strict";
import { UniversalRuntimeProofHarness, standardSimulatedEmbodiments } from "../src/index.js";

test("same ECA-1 proof harness qualifies multiple embodiment classes", async () => {
  const harness = new UniversalRuntimeProofHarness();
  const proof = await harness.proveCrossEmbodimentContinuity(standardSimulatedEmbodiments());
  assert.equal(proof.passed, true);
  assert.equal(proof.results.length, 4);
  assert.equal(proof.failures.length, 0);
  assert.ok(proof.results.every((result) => result.latency.count === 1));
});

test("expired capability evidence blocks readiness", async () => {
  const harness = new UniversalRuntimeProofHarness();
  const platform = standardSimulatedEmbodiments()[0];
  assert.ok(platform);
  const now = Date.now();
  harness.qualify(platform.id, "move", "expired-evidence", 1, now - 100);
  const result = await harness.assessPlatform(
    platform,
    [{ capability: "move", required: true }],
    harness.freshFacts(platform.id, now),
    250
  );
  assert.equal(result.ready, false);
  assert.ok(result.reasons.some((reason) => reason.includes("qualification-expired")));
});

test("stale state blocks readiness even with valid capability evidence", async () => {
  const harness = new UniversalRuntimeProofHarness();
  const platform = standardSimulatedEmbodiments()[1];
  assert.ok(platform);
  harness.qualify(platform.id, "move", "fresh-evidence");
  const stale = Date.now() - 10_000;
  const result = await harness.assessPlatform(
    platform,
    [{ capability: "move", required: true }],
    harness.freshFacts(platform.id, stale),
    250
  );
  assert.equal(result.ready, false);
  assert.ok(result.reasons.some((reason) => reason.includes("state:stale")));
});
