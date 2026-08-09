import test from "node:test";
import assert from "node:assert/strict";
import {
  DriverQualification,
  UniversalDriverSDK,
  type UniversalDriverImplementation
} from "../src/index.js";

function implementation(remoteSafety = false): UniversalDriverImplementation {
  return {
    descriptor: () => ({
      id: "real-test-platform",
      manufacturer: "example",
      model: "physical-test",
      endpoints: [
        { id: "sensor-1", role: "sensor", transport: "native", local: true, deterministic: true, maxRoundTripMs: 2 },
        { id: "safety-1", role: "safety", transport: "native", local: !remoteSafety, deterministic: true, maxRoundTripMs: 1 },
        { id: "actuator-1", role: "actuator", transport: "native", local: true, deterministic: true, maxRoundTripMs: 3 }
      ]
    }),
    capabilities: () => [{ id: "move", description: "Move physical platform", maxLatencyMs: 80 }],
    readSensors: async () => [{
      source: "sensor-1",
      kind: "body:position",
      timestamp: Date.now(),
      data: { x: 0 },
      confidence: 0.99,
      health: "nominal"
    }],
    readState: async () => ({
      timestamp: Date.now(),
      body: { speed: 0 },
      world: {},
      mission: { authorized: true },
      health: { emergencyStop: false }
    }),
    writeAction: async (action, clearance) => ({
      accepted: clearance.allowed,
      completed: clearance.allowed,
      timestamp: Date.now(),
      outcome: { capability: action.capability }
    }),
    emergencyStop: async () => {},
    heartbeat: async () => ({ healthy: true, timestamp: Date.now() })
  };
}

test("manufacturer implementation connects without changing ECA-1 cognition", async () => {
  const sdk = new UniversalDriverSDK();
  const { driver, adapter } = await sdk.connect(implementation());
  assert.equal(adapter.id, "real-test-platform");
  assert.equal((await driver.capabilities())[0]?.id, "move");

  const report = await new DriverQualification().inspect(driver);
  assert.equal(report.passed, true);
  assert.equal(report.issues.some((issue) => issue.severity === "blocker"), false);
});

test("real driver qualification blocks remote safety endpoint", async () => {
  const driver = new UniversalDriverSDK().build(implementation(true));
  const report = await new DriverQualification().inspect(driver);
  assert.equal(report.passed, false);
  assert.ok(report.issues.some((issue) => issue.code === "remote-safety-endpoint"));
});
