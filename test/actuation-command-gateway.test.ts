import test from "node:test";
import assert from "node:assert/strict";
import {
  ActuationCommandGateway,
  type ActuationCommandEnvelope,
  type PhysicalRobotDriver
} from "../src/index.js";

function makeDriver(): PhysicalRobotDriver {
  return {
    descriptor: async () => ({ id: "robot-1", endpoints: [] }),
    capabilities: async () => [{ id: "move", description: "Move", maxLatencyMs: 50 }],
    readSensors: async () => [],
    readState: async () => ({ timestamp: 1_000, body: {}, world: {}, mission: {}, health: {} }),
    writeAction: async (action, clearance) => ({
      accepted: clearance.allowed,
      completed: clearance.allowed,
      timestamp: 1_000,
      outcome: { id: action.id }
    }),
    emergencyStop: async () => {}
  };
}

function makeEnvelope(overrides: Partial<ActuationCommandEnvelope> = {}): ActuationCommandEnvelope {
  return {
    action: {
      id: "cmd-1",
      capability: "move",
      command: { position: 1 },
      reason: "test",
      confidence: 0.99,
      createdAt: 990
    },
    clearance: {
      allowed: true,
      reasons: [],
      authority: "operator",
      expiresAt: 1_100
    },
    issuedAt: 995,
    deadline: 1_050,
    sequence: 1,
    ...overrides
  };
}

test("executes a valid physical command exactly once", async () => {
  const gateway = new ActuationCommandGateway(makeDriver(), { now: () => 1_000 });
  const first = await gateway.execute(makeEnvelope());
  assert.equal(first.status, "executed");
  assert.equal(gateway.hasSeen("cmd-1"), true);

  const duplicate = await gateway.execute(makeEnvelope());
  assert.equal(duplicate.status, "rejected");
  if (duplicate.status === "rejected") {
    assert.equal(duplicate.rejection.code, "duplicate-command");
  }
});

test("rejects expired clearance and stale command deadlines", async () => {
  const gateway = new ActuationCommandGateway(makeDriver(), { now: () => 1_000 });

  const expiredClearance = await gateway.execute(makeEnvelope({
    clearance: { allowed: true, reasons: [], authority: "operator", expiresAt: 1_000 }
  }));
  assert.equal(expiredClearance.status, "rejected");
  if (expiredClearance.status === "rejected") {
    assert.equal(expiredClearance.rejection.code, "clearance-expired");
  }

  const stale = await gateway.execute(makeEnvelope({
    action: { ...makeEnvelope().action, id: "cmd-2" },
    deadline: 1_000
  }));
  assert.equal(stale.status, "rejected");
  if (stale.status === "rejected") {
    assert.equal(stale.rejection.code, "deadline-expired");
  }
});

test("rejects out-of-order commands within an ordering domain", async () => {
  const gateway = new ActuationCommandGateway(makeDriver(), { now: () => 1_000 });

  const first = await gateway.execute(makeEnvelope({ sequence: 7 }));
  assert.equal(first.status, "executed");

  const second = await gateway.execute(makeEnvelope({
    action: { ...makeEnvelope().action, id: "cmd-2" },
    sequence: 6
  }));
  assert.equal(second.status, "rejected");
  if (second.status === "rejected") {
    assert.equal(second.rejection.code, "out-of-order-command");
  }
});

test("rejects capabilities not exposed by the robot", async () => {
  const gateway = new ActuationCommandGateway(makeDriver(), { now: () => 1_000 });
  const outcome = await gateway.execute(makeEnvelope({
    action: { ...makeEnvelope().action, id: "cmd-unknown", capability: "fly" }
  }));
  assert.equal(outcome.status, "rejected");
  if (outcome.status === "rejected") {
    assert.equal(outcome.rejection.code, "unknown-capability");
  }
});
