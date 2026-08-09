import test from "node:test";
import assert from "node:assert/strict";
import { UniversalAutoIntegration } from "../src/integration/UniversalAutoIntegration.js";
import type { PhysicalRobotDriver } from "../src/hardware/UniversalPhysicalRobotContract.js";

function driver(localSafety = true): PhysicalRobotDriver {
  return {
    async descriptor() {
      return {
        id: "physical-robot-1",
        manufacturer: "Example Robotics",
        model: "XR-1",
        endpoints: [
          { id: "sensor-main", role: "sensor", transport: "native", local: true },
          { id: "actuator-main", role: "actuator", transport: "native", local: true, deterministic: true },
          { id: "safety-main", role: "safety", transport: "native", local: localSafety, deterministic: true }
        ]
      };
    },
    async capabilities() { return [{ id: "move", description: "Move physical platform", maxLatencyMs: 80 }]; },
    async readSensors() { return [{ source: "sensor-main", kind: "body:state", timestamp: Date.now(), data: { position: 0 }, confidence: 0.99, health: "nominal" as const }]; },
    async readState() { return { timestamp: Date.now(), body: { position: 0 }, world: {}, mission: {}, health: {} }; },
    async writeAction() { return { accepted: true, completed: true, timestamp: Date.now(), outcome: {} }; },
    async emergencyStop() {}
  };
}

test("connect robot discovers interfaces and leaves inferred capability unqualified", async () => {
  const integration = new UniversalAutoIntegration();
  integration.registerFactory({ canHandle: () => true, create: async () => driver(true) });
  const report = await integration.connect({ connection: "native" });
  assert.equal(report.robotId, "physical-robot-1");
  assert.equal(report.interfaces.length, 3);
  assert.equal(report.safetySurfaces[0], "safety-main");
  assert.equal(report.capabilities[0].id, "move");
  assert.equal(report.capabilities[0].qualified, false);
  assert.equal(report.status, "needs-calibration");
});

test("remote safety surface blocks automatic integration", async () => {
  const integration = new UniversalAutoIntegration();
  integration.registerFactory({ canHandle: () => true, create: async () => driver(false) });
  const report = await integration.connect({ connection: "native" });
  assert.equal(report.status, "blocked");
});
