import test from "node:test";
import assert from "node:assert/strict";
import { FleetReleaseCoordinator, OEMProvisioningRegistry } from "../src/index.js";

test("fleet release coordinator enforces staged rollout and rollback", () => {
  const releases = new FleetReleaseCoordinator();
  releases.plan("robot-1", "2.0.0", "1.9.0", 1_000);
  assert.equal(releases.status("robot-1")?.state, "pending");

  releases.markDeploying("robot-1", 1_010);
  releases.markFailed("robot-1", "health-check-failed", 1_020);
  assert.equal(releases.rollback("robot-1", 1_030), "1.9.0");
  assert.equal(releases.status("robot-1")?.state, "rolled-back");
});

test("fleet release coordinator blocks overlapping active releases", () => {
  const releases = new FleetReleaseCoordinator();
  releases.plan("robot-1", "2.0.0", "1.9.0", 1_000);
  assert.throws(() => releases.plan("robot-1", "2.0.1", "1.9.0", 1_001));
});

test("OEM provisioning preserves unique unit and device identities", () => {
  const registry = new OEMProvisioningRegistry();
  registry.register({
    unitId: "unit-1",
    oemId: "oem-1",
    manufacturer: "example",
    model: "robot-a",
    deviceIdentity: "device-key-1"
  }, 1_000);

  assert.throws(() => registry.register({
    unitId: "unit-2",
    oemId: "oem-1",
    manufacturer: "example",
    model: "robot-a",
    deviceIdentity: "device-key-1"
  }, 1_001));

  registry.markProvisioned("unit-1", 1_010);
  registry.markActivated("unit-1", 1_020);
  assert.equal(registry.get("unit-1")?.state, "activated");
  registry.retire("unit-1", 1_030);
  assert.equal(registry.get("unit-1")?.state, "retired");
});
