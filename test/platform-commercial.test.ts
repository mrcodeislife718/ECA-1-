import test from "node:test";
import assert from "node:assert/strict";
import { projectAnnualRecurringRevenue, impliedValuation, ECA1_SCALE_SCENARIOS } from "../src/commercial/EconomicsModel.js";
import { LicensingEngine } from "../src/commercial/LicensingEngine.js";
import { DeploymentLifecycle } from "../src/deployment/DeploymentLifecycle.js";
import { TimeToQualifiedWork } from "../src/metrics/TimeToQualifiedWork.js";
import { OEMActivation } from "../src/oem/OEMActivation.js";

void test("recurring revenue scenarios preserve the core ECA-1 scaling math", () => {
  const first = projectAnnualRecurringRevenue(ECA1_SCALE_SCENARIOS[0]);
  assert.equal(first.totalArrUsd, 100_000_000);
  const million = projectAnnualRecurringRevenue(ECA1_SCALE_SCENARIOS[2]);
  assert.equal(million.totalArrUsd, 10_000_000_000);
  const infrastructure = projectAnnualRecurringRevenue(ECA1_SCALE_SCENARIOS[4]);
  assert.equal(infrastructure.totalArrUsd, 25_000_000_000);
  assert.equal(impliedValuation(1_000_000_000, 10).impliedEnterpriseValueUsd, 10_000_000_000);
});

void test("entitlements expire instead of silently granting continued access", () => {
  const licensing = new LicensingEngine();
  licensing.issue({
    id: "license-1",
    customerId: "customer",
    product: "brain",
    scope: "robot",
    scopeId: "robot-1",
    features: ["brain-runtime"],
    validFrom: 100,
    validUntil: 200,
    status: "active"
  });
  assert.equal(licensing.validate("robot-1", "brain-runtime", 150).allowed, true);
  assert.equal(licensing.validate("robot-1", "brain-runtime", 250).allowed, false);
});

void test("proof threshold ladder cannot skip missing earlier evidence", () => {
  const lifecycle = new DeploymentLifecycle();
  lifecycle.record({ id: "code", stage: "code", passed: true, timestamp: 1, source: "test" });
  lifecycle.record({ id: "real", stage: "real-robot", passed: true, timestamp: 2, source: "test" });
  assert.equal(lifecycle.highestProvenStage(), "code");
  assert.equal(lifecycle.nextRequiredStage(), "simulation");
});

void test("TQW measures connection to qualified useful work", () => {
  const tqw = new TimeToQualifiedWork();
  const start = 1_000;
  tqw.mark({ milestone: "connected", timestamp: start });
  tqw.mark({ milestone: "discovered", timestamp: start + 10 });
  tqw.mark({ milestone: "integrated", timestamp: start + 20 });
  tqw.mark({ milestone: "calibrated", timestamp: start + 30 });
  tqw.mark({ milestone: "qualified", timestamp: start + 40 });
  tqw.mark({ milestone: "mission-ready", timestamp: start + 50 });
  tqw.mark({ milestone: "useful-work-started", timestamp: start + 60 });
  const report = tqw.report();
  assert.equal(report.complete, true);
  assert.equal(report.totalMs, 60);
});

void test("OEM units require activation entitlement before brain features are valid", () => {
  const oem = new OEMActivation();
  oem.register({ oemId: "oem-a", unitId: "unit-1", manufacturer: "Example", model: "R1" });
  assert.equal(oem.validate("unit-1", "brain-runtime").allowed, false);
  oem.activate("unit-1", "customer-a", 100, 200);
  assert.equal(oem.validate("unit-1", "brain-runtime", 150).allowed, true);
});
