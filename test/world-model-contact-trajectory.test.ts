import test from "node:test";
import assert from "node:assert/strict";
import { ContactStateEstimator, TrajectoryPromotionPipeline, WorldModelEnsemble } from "../src/index.js";

test("world model ensemble preserves alternatives and selects strongest consensus", async () => {
  const ensemble = new WorldModelEnsemble();
  ensemble.register({ id: "a", predict: async () => ({ modelId: "a", predictedState: { x: 1 }, confidence: 0.8, uncertainty: 0.1, generatedAt: 1 }) });
  ensemble.register({ id: "b", predict: async () => ({ modelId: "b", predictedState: { x: 2 }, confidence: 0.9, uncertainty: 0.05, generatedAt: 1 }) });
  const result = await ensemble.predict({ state: {}, horizonMs: 100 }, 0.5);
  assert.equal(result.accepted.length, 2);
  assert.equal(result.consensus?.modelId, "b");
  assert.ok(result.disagreement > 0);
});

test("contact estimator detects slip and overload", () => {
  const estimator = new ContactStateEstimator({ approachForceN: 1, stableForceN: 5, overloadForceN: 20, slipRatio: 0.5, maxObservationAgeMs: 100 });
  const slip = estimator.estimate([{ source: "wrist", timestamp: 10, normalForceN: 10, tangentialForceN: 6, confidence: 1 }], 20);
  assert.equal(slip.state, "slipping");
  const overload = estimator.estimate([{ source: "wrist", timestamp: 20, normalForceN: 25, confidence: 1 }], 30);
  assert.equal(overload.state, "overload");
  assert.throws(() => estimator.assertWithinEnvelope(overload));
});

test("trajectory promotion requires monotonic qualified evidence-backed artifacts", () => {
  const pipeline = new TrajectoryPromotionPipeline();
  const artifact = {
    id: "traj-1", embodimentId: "arm", environmentId: "garage", generator: "sim", generatedAt: 1,
    frames: [
      { timestamp: 1, observation: { x: 0 }, action: { dx: 1 } },
      { timestamp: 2, observation: { x: 1 }, action: { dx: 0 }, terminal: true }
    ]
  };
  assert.equal(pipeline.qualify(artifact).accepted, true);
  const record = pipeline.promote(artifact, "candidate-policy", ["qualification:test"], 3);
  assert.equal(record.artifactId, "traj-1");
});
