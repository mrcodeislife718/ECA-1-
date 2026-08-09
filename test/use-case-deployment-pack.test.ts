import test from "node:test";
import assert from "node:assert/strict";
import { UseCaseDeploymentPackBuilder } from "../src/integration/UseCaseDeploymentPack.js";

const builder = new UseCaseDeploymentPackBuilder();

test("builds edge cases around the customer's actual use case", () => {
  const pack = builder.build({
    id: "factory-cell",
    industry: "manufacturing",
    environment: ["indoor-factory"],
    tasks: ["precision-insertion"],
    humansPresent: true,
    autonomyLevel: "supervised",
    criticality: "high",
    operatingHoursPerDay: 20,
    environmentalHazards: ["metal-debris"],
    connectivityAssumptions: ["supervisory-uplink"],
    precisionRequirements: ["micrometer-scale-clearance"],
    customDimensions: { humanInteractionPolicy: "guarded-collaboration" }
  });

  const ids = new Set(pack.edgeCases.map((item) => item.id));
  assert.equal(ids.has("unexpected-human-entry"), true);
  assert.equal(ids.has("uplink-degradation-or-loss"), true);
  assert.equal(ids.has("environment:metal-debris"), true);
  assert.equal(ids.has("task-interruption:precision-insertion"), true);
  assert.equal(ids.has("unknown-unknown"), true);
  assert.equal(pack.unresolvedQuestions.length, 0);
});

test("does not force irrelevant human or uplink cases into every deployment", () => {
  const pack = builder.build({
    id: "sealed-lab-device",
    environment: ["sealed-enclosure"],
    tasks: ["sample-transfer"],
    humansPresent: false,
    autonomyLevel: "autonomous",
    criticality: "medium",
    operatingHoursPerDay: 8,
    precisionRequirements: ["repeatable-transfer"]
  });

  const ids = new Set(pack.edgeCases.map((item) => item.id));
  assert.equal(ids.has("unexpected-human-entry"), false);
  assert.equal(ids.has("uplink-degradation-or-loss"), false);
  assert.equal(ids.has("unknown-unknown"), true);
});
