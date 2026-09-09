import test from "node:test";
import assert from "node:assert/strict";
import { createHash, generateKeyPairSync, sign } from "node:crypto";
import {
  LicensingEngine,
  QualificationGate,
  RuntimeEntitlementGate,
  SignedUpdateManager
} from "../src/index.js";

test("runtime entitlement gate enforces licensed features", () => {
  const licensing = new LicensingEngine();
  licensing.issue({
    id: "ent-1",
    customerId: "customer-1",
    product: "brain",
    scope: "robot",
    scopeId: "robot-1",
    features: ["brain-runtime"],
    validFrom: 900,
    validUntil: 1_100,
    status: "active"
  });

  const gate = new RuntimeEntitlementGate(licensing);
  assert.equal(gate.permitted({ scopeId: "robot-1", feature: "brain-runtime", requestedAt: 1_000 }), true);
  assert.equal(gate.permitted({ scopeId: "robot-1", feature: "fleet-control", requestedAt: 1_000 }), false);
  assert.throws(() => gate.authorize({ scopeId: "robot-1", feature: "fleet-control", requestedAt: 1_000 }));
});

test("signed update manager verifies artifact integrity and signature", () => {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const publicKeyPem = publicKey.export({ type: "spki", format: "pem" }).toString();
  const artifact = Buffer.from("eca-1-runtime-v1", "utf8");
  const sha256 = createHash("sha256").update(artifact).digest("hex");
  const signature = sign(null, Buffer.from(`1.0.0:${sha256}`, "utf8"), privateKey);

  const manager = new SignedUpdateManager();
  manager.trustKey("release-key", publicKeyPem);
  const installed = manager.install({ version: "1.0.0", artifact, sha256, signature, keyId: "release-key" }, 1_000);
  assert.equal(installed.version, "1.0.0");
  assert.equal(manager.current()?.sha256, sha256);

  assert.throws(() => manager.install({
    version: "1.0.1",
    artifact: Buffer.from("tampered", "utf8"),
    sha256,
    signature,
    keyId: "release-key"
  }));
});

test("qualification gate blocks release until all required evidence passes", () => {
  const gate = new QualificationGate(["safety", "recovery", "latency"]);
  gate.record({ id: "safe-1", category: "safety", required: true, passed: true, measuredAt: 1_000 });
  gate.record({ id: "recover-1", category: "recovery", required: true, passed: false, measuredAt: 1_000 });

  const blocked = gate.evaluate();
  assert.equal(blocked.qualified, false);
  assert.deepEqual(blocked.failedRequiredChecks, ["recover-1"]);
  assert.deepEqual(blocked.missingCategories, ["latency", "recovery"]);

  gate.record({ id: "recover-2", category: "recovery", required: true, passed: true, measuredAt: 1_001 });
  gate.record({ id: "latency-1", category: "latency", required: true, passed: true, measuredAt: 1_001 });
  assert.equal(gate.evaluate().qualified, false);

  gate.record({ id: "recover-1", category: "recovery", required: true, passed: true, measuredAt: 1_002 });
  assert.equal(gate.evaluate().qualified, true);
  assert.doesNotThrow(() => gate.assertQualified());
});
