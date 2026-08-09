import type { Capability } from "../contracts.js";
import type { PhysicalRobotDriver, PhysicalRobotDescriptor } from "./UniversalPhysicalRobotContract.js";

export type DriverQualificationIssue = {
  code: string;
  severity: "warning" | "blocker";
  detail: string;
};

export type DriverQualificationReport = {
  descriptor: PhysicalRobotDescriptor;
  capabilities: Capability[];
  passed: boolean;
  issues: DriverQualificationIssue[];
};

/**
 * Performs non-actuating checks before ECA-1 considers a physical driver
 * eligible for calibration or mission qualification.
 */
export class DriverQualification {
  async inspect(driver: PhysicalRobotDriver): Promise<DriverQualificationReport> {
    const [descriptor, capabilities, state, sensors] = await Promise.all([
      driver.descriptor(),
      driver.capabilities(),
      driver.readState(),
      driver.readSensors()
    ]);

    const issues: DriverQualificationIssue[] = [];
    const blocker = (code: string, detail: string) => issues.push({ code, detail, severity: "blocker" as const });
    const warning = (code: string, detail: string) => issues.push({ code, detail, severity: "warning" as const });

    if (!descriptor.id.trim()) blocker("descriptor-id-missing", "Physical descriptor must have a stable non-empty id.");
    if (descriptor.endpoints.length === 0) blocker("endpoints-missing", "At least one physical endpoint must be exposed.");
    if (capabilities.length === 0) blocker("capabilities-missing", "At least one capability must be declared.");
    if (!Number.isFinite(state.timestamp)) blocker("state-timestamp-invalid", "Robot state must include a finite timestamp.");
    if (sensors.some((sensor) => !Number.isFinite(sensor.timestamp))) blocker("sensor-timestamp-invalid", "Sensor observations require finite timestamps.");
    if (sensors.some((sensor) => sensor.confidence < 0 || sensor.confidence > 1)) blocker("sensor-confidence-invalid", "Sensor confidence must remain within [0, 1].");

    const ids = new Set<string>();
    for (const endpoint of descriptor.endpoints) {
      if (ids.has(endpoint.id)) blocker("endpoint-id-duplicate", `Duplicate physical endpoint id: ${endpoint.id}`);
      ids.add(endpoint.id);
      if (!endpoint.local && endpoint.role === "safety") blocker("remote-safety-endpoint", `Safety endpoint ${endpoint.id} is not local.`);
      if (endpoint.maxRoundTripMs !== undefined && endpoint.maxRoundTripMs < 0) blocker("endpoint-latency-invalid", `Endpoint ${endpoint.id} has invalid round-trip timing.`);
      if (endpoint.deterministic === false && endpoint.role === "safety") warning("safety-path-nondeterministic", `Safety endpoint ${endpoint.id} is declared non-deterministic.`);
    }

    const capabilityIds = new Set<string>();
    for (const capability of capabilities) {
      if (capabilityIds.has(capability.id)) blocker("capability-id-duplicate", `Duplicate capability id: ${capability.id}`);
      capabilityIds.add(capability.id);
      if (!Number.isFinite(capability.maxLatencyMs) || capability.maxLatencyMs < 0) blocker("capability-latency-invalid", `Capability ${capability.id} has invalid maxLatencyMs.`);
    }

    if (driver.heartbeat) {
      const heartbeat = await driver.heartbeat();
      if (!heartbeat.healthy) blocker("driver-heartbeat-unhealthy", "Driver heartbeat reports unhealthy state.");
      if (!Number.isFinite(heartbeat.timestamp)) blocker("driver-heartbeat-timestamp-invalid", "Heartbeat timestamp must be finite.");
    } else {
      warning("driver-heartbeat-unavailable", "Driver does not expose optional heartbeat health data.");
    }

    return {
      descriptor,
      capabilities,
      issues,
      passed: !issues.some((issue) => issue.severity === "blocker")
    };
  }
}
