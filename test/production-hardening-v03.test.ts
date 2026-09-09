import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import {
  ActuatorHealthFusion,
  ClockDiscipline,
  HardwareCapabilityManifestValidator,
  ContactAwareActionGate,
  RollbackExecutor,
  DeviceIdentityRegistry,
  type ContactEstimate,
  type CandidateAction,
  type RollbackArtifact
} from "../src/index.js";

test("actuator health fusion escalates tracking and thermal faults", () => {
  const fusion = new ActuatorHealthFusion({
    maxTemperatureC: 80,
    maxTorqueErrorNm: 5,
    maxPositionError: 0.2,
    maxVelocityError: 0.5,
    maxCurrentA: 20,
    maxObservationAgeMs: 1000
  });
  const report = fusion.evaluate("joint-1", [{
    actuatorId: "joint-1",
    source: "servo",
    timestamp: 1000,
    confidence: 1,
    temperatureC: 90,
    commandedTorqueNm: 10,
    measuredTorqueNm: 2,
    commandedPosition: 1,
    measuredPosition: 0.6,
    currentA: 25
  }], 1100);
  assert.equal(report.state, "critical");
  assert.ok(report.reasons.includes("temperature-limit"));
  assert.throws(() => fusion.assertOperational(report), /actuator-health-critical/);
});

test("clock discipline rejects unsynchronized sources and normalizes synchronized time", () => {
  const clocks = new ClockDiscipline({ maxOffsetMs: 5, maxJitterMs: 1 });
  clocks.record({ sourceId: "controller", sourceTimestamp: 1004, referenceTimestamp: 1000, observedAt: 1000 });
  clocks.record({ sourceId: "controller", sourceTimestamp: 2004, referenceTimestamp: 2000, observedAt: 2000 });
  assert.equal(clocks.status("controller").synchronized, true);
  assert.equal(clocks.normalize("controller", 3004), 3000);
  assert.throws(() => clocks.assertSynchronized("unknown"), /clock-unsynchronized/);
});

test("hardware manifest blocks missing local safety infrastructure", () => {
  const report = new HardwareCapabilityManifestValidator().validate({
    deviceId: "robot-1",
    transports: ["ethernet"],
    sensors: [{ id: "camera", kind: "rgb" }],
    actuators: [{ id: "joint-1", kind: "rotary", positionMin: -1, positionMax: 1 }],
    safety: { emergencyStop: true, hardwareWatchdog: false, localSafetyLoop: false }
  });
  assert.equal(report.passed, false);
  assert.ok(report.issues.some((issue) => issue.code === "hardware-watchdog-missing"));
  assert.ok(report.issues.some((issue) => issue.code === "local-safety-loop-missing"));
});

test("contact-aware gate blocks overloaded contact and unhealthy actuators", () => {
  const gate = new ContactAwareActionGate();
  gate.register({ capability: "grasp", allowedContactStates: ["stable-contact"], minimumConfidence: 0.8, requireHealthyActuator: true });
  const action: CandidateAction = {
    id: "a1",
    capability: "grasp",
    command: {},
    reason: "test",
    confidence: 1,
    createdAt: 1
  };
  const contact: ContactEstimate = {
    state: "overload",
    confidence: 1,
    totalNormalForceN: 100,
    totalTangentialForceN: 0,
    maxTorqueNm: 0,
    sources: ["ft"],
    timestamp: 1,
    reasons: ["normal-force-overload"]
  };
  const decision = gate.evaluate(action, contact, {
    actuatorId: "joint-1",
    state: "critical",
    confidence: 1,
    timestamp: 1,
    reasons: ["temperature-limit"],
    metrics: {
      maxTemperatureC: 90,
      maxTorqueErrorNm: 0,
      maxPositionError: 0,
      maxVelocityError: 0,
      maxCurrentA: 0,
      maxVibrationRms: 0,
      maxCalibrationError: 0
    }
  });
  assert.equal(decision.allowed, false);
  assert.ok(decision.reasons.includes("contact-overload"));
  assert.ok(decision.reasons.includes("actuator-health-critical"));
});

test("rollback executor stages, activates and verifies the requested artifact", async () => {
  const artifact: RollbackArtifact = { version: "1.0.0", sha256: "abc", artifact: new Uint8Array([1, 2, 3]) };
  const calls: string[] = [];
  const executor = new RollbackExecutor(
    { get: async () => artifact },
    {
      stage: async () => { calls.push("stage"); },
      activate: async () => { calls.push("activate"); },
      verifyActive: async () => { calls.push("verify"); return true; }
    },
    () => 100
  );
  const result = await executor.execute({ version: "1.0.0", installedAt: 1, sha256: "abc" });
  assert.equal(result.status, "activated");
  assert.deepEqual(calls, ["stage", "activate", "verify"]);
});

test("device identity rotation requires proof from the currently enrolled key", () => {
  const oldPair = generateKeyPairSync("ed25519");
  const newPair = generateKeyPairSync("ed25519");
  const registry = new DeviceIdentityRegistry();
  registry.enroll({
    deviceId: "robot-1",
    keyId: "key-1",
    publicKeyPem: oldPair.publicKey.export({ type: "spki", format: "pem" }).toString(),
    enrolledAt: 1
  });
  const newPublicKeyPem = newPair.publicKey.export({ type: "spki", format: "pem" }).toString();
  const issuedAt = 100;
  const payload = Buffer.from(`rotate:robot-1:key-1:key-2:${issuedAt}:${newPublicKeyPem}`, "utf8");
  const signature = sign(null, payload, oldPair.privateKey);
  const rotated = registry.rotateKey({
    deviceId: "robot-1",
    currentKeyId: "key-1",
    newKeyId: "key-2",
    newPublicKeyPem,
    issuedAt,
    signature
  }, 60_000, 200);
  assert.equal(rotated.keyId, "key-2");
  assert.equal(rotated.rotatedAt, 200);
});
