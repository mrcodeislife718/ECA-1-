import test from "node:test";
import assert from "node:assert/strict";
import {
  BrainDeploymentTarget,
  PortableBrainPackage,
  DeploymentPortabilityPlanner,
  LeadershipScorecard
} from "../src/index.js";

const requirements = {
  minimumMemoryMb: 512,
  minimumStorageMb: 1024,
  requiresAccelerator: false,
  requiresLocalSafetyPath: true,
  maxCriticalPathRoundTripMs: 20
};

test("ECA-1 prefers downloadable onboard deployment when existing robot compute is sufficient", () => {
  const target = new BrainDeploymentTarget();
  const decisions = target.evaluate({ memoryMb: 4096, persistentStorageMb: 8192, realTimeControllerAvailable: true }, requirements);
  const selected = target.select(decisions);
  assert.equal(selected.eligible, true);
  assert.equal(selected.mode, "downloaded-onboard");
});

test("portable brain package qualifies existing compute without requiring ECA-1 hardware", () => {
  const pkg = new PortableBrainPackage({
    brainId: "eca-1",
    version: "0.4.0",
    modules: [
      { id: "core", version: "0.4.0", required: true, estimatedMemoryMb: 256, estimatedStorageMb: 400 },
      { id: "recovery", version: "0.4.0", required: true, estimatedMemoryMb: 128, estimatedStorageMb: 200 }
    ],
    supportedModes: ["downloaded-onboard", "preinstalled-oem", "external-edge-runtime"],
    requirements,
    integrity: { algorithm: "sha256", digest: "test-digest" },
    rollbackVersion: "0.3.0"
  });
  const result = pkg.qualify({ memoryMb: 2048, persistentStorageMb: 4096 });
  assert.equal(result.installable, true);
});

test("portability planner only falls back to external edge compute when onboard compute cannot host the brain", () => {
  const pkg = new PortableBrainPackage({
    brainId: "eca-1",
    version: "0.4.0",
    modules: [{ id: "core", version: "0.4.0", required: true, estimatedMemoryMb: 2048, estimatedStorageMb: 2048 }],
    supportedModes: ["downloaded-onboard", "external-edge-runtime"],
    requirements: { ...requirements, minimumMemoryMb: 2048, minimumStorageMb: 2048 },
    integrity: { algorithm: "sha256", digest: "test-digest" }
  });
  const planner = new DeploymentPortabilityPlanner();
  const plan = planner.plan(pkg, { memoryMb: 256, persistentStorageMb: 512, realTimeControllerAvailable: true }, pkg.manifest.requirements);
  assert.equal(plan.softwareOnly, false);
  assert.equal(plan.externalHardwareRequired, true);
  assert.equal(plan.selectedMode, "external-edge-runtime");
});

test("leadership scorecard rewards real universality and lower deployment friction", () => {
  const scorecard = new LeadershipScorecard();
  const current = {
    realRobotEmbodiments: 12,
    unrelatedManufacturers: 6,
    productionUseCases: 8,
    medianTimeToQualifiedWorkMs: 3_600_000,
    autonomousRecoveryRate: 0.9,
    recurrencePreventionRate: 0.75,
    brainRewriteRate: 0.01,
    softwareOnlyDeploymentRate: 0.85,
    qualifiedFleetUnits: 500,
    oemPrograms: 3
  };
  assert.equal(scorecard.allSatisfied(current, {
    realRobotEmbodiments: 10,
    unrelatedManufacturers: 5,
    medianTimeToQualifiedWorkMs: 7_200_000,
    brainRewriteRate: 0.02,
    softwareOnlyDeploymentRate: 0.8
  }), true);
});
