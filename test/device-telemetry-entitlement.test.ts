import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DeviceIdentityRegistry, SignedEntitlementStore, TelemetryBuffer } from "../src/index.js";

test("device challenge cannot be replayed after successful authentication", () => {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const registry = new DeviceIdentityRegistry();
  registry.enroll({ deviceId: "robot-1", keyId: "k1", publicKeyPem: publicKey.export({ type: "spki", format: "pem" }).toString(), enrolledAt: 1 });
  const challenge = registry.challenge("robot-1", 1_000, 10);
  const payload = Buffer.from(`${challenge.deviceId}:${challenge.nonce}:${challenge.issuedAt}:${challenge.expiresAt}`, "utf8");
  const signature = sign(null, payload, privateKey);
  assert.equal(registry.authenticate("robot-1", challenge.nonce, signature, 20), true);
  assert.equal(registry.authenticate("robot-1", challenge.nonce, signature, 21), false);
});

test("telemetry buffer is bounded and produces incident bundles", () => {
  const telemetry = new TelemetryBuffer(2);
  telemetry.append({ id: "1", deviceId: "r", timestamp: 1, kind: "health", severity: "info", payload: {} });
  telemetry.append({ id: "2", deviceId: "r", timestamp: 2, kind: "command", severity: "warn", payload: {}, commandId: "c" });
  telemetry.append({ id: "3", deviceId: "r", timestamp: 3, kind: "fault", severity: "error", payload: {} });
  assert.equal(telemetry.size(), 2);
  assert.equal(telemetry.incidentBundle("r", 2).records.length, 2);
});

test("signed entitlement documents persist atomically and verify on load", async () => {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const dir = await mkdtemp(join(tmpdir(), "eca1-entitlements-"));
  const file = join(dir, "entitlements.json");
  const store = new SignedEntitlementStore(file);
  const publicPem = publicKey.export({ type: "spki", format: "pem" }).toString();
  store.trustKey("k1", publicPem);
  const base = {
    version: 1 as const,
    issuedAt: 1,
    keyId: "k1",
    entitlements: [{ id: "e1", customerId: "c", product: "brain" as const, scope: "robot" as const, scopeId: "r1", features: ["brain-runtime"], validFrom: 1, status: "active" as const }]
  };
  const payload = Buffer.from(JSON.stringify(base), "utf8");
  const document = { ...base, signatureBase64: sign(null, payload, privateKey).toString("base64") };
  await store.writeVerified(document);
  assert.equal((await store.load())[0]?.id, "e1");
  assert.ok((await readFile(file, "utf8")).includes("signatureBase64"));
});
