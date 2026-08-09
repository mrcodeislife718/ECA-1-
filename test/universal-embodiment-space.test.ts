import test from "node:test";
import assert from "node:assert/strict";
import {
  UniversalEmbodimentSpace,
  type UniversalEmbodimentCase
} from "../src/index.js";

const base: UniversalEmbodimentCase = {
  descriptor: {
    id: "unknown-machine",
    morphology: ["noncanonical"],
    mobility: ["unknown"],
    manipulation: ["custom-end-effector"],
    sensing: ["proprioceptive", "environmental"],
    actuation: ["custom-actuation"],
    controlSurfaces: ["capability-contract"],
    operatingMedia: ["unspecified"],
    energySources: ["unspecified"],
    communicationModes: ["local"],
    humanInteractionModes: [],
    environmentTags: ["novel"],
    constraints: {},
    unknownDimensions: { futureAxis: "accepted-without-core-change" }
  },
  capabilities: [{ id: "move", description: "Abstract motion capability", maxLatencyMs: 80 }]
};

test("universal embodiment space accepts bodies outside named robot categories", async () => {
  const space = new UniversalEmbodimentSpace();
  const embodiment = space.instantiate(base);
  assert.equal(embodiment.kind, "noncanonical");
  assert.equal((await embodiment.capabilities())[0]?.id, "move");
});

test("new embodiment dimensions can be introduced without changing ECA-1 core", () => {
  const space = new UniversalEmbodimentSpace();
  const [variant] = space.combine(base, [{
    id: "future-embodiment",
    morphology: ["shape-not-yet-invented"],
    operatingMedia: ["future-medium"],
    unknownDimensions: { novelPhysicalInterface: true }
  }]);
  assert.equal(variant?.descriptor.morphology[0], "shape-not-yet-invented");
  assert.equal(variant?.descriptor.unknownDimensions.novelPhysicalInterface, true);
});
