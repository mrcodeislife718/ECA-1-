export type HardwareCapabilityManifest = {
  deviceId: string;
  manufacturer?: string;
  model?: string;
  firmware?: string;
  architecture?: string;
  compute?: {
    cpuCores?: number;
    accelerator?: string;
    memoryMb?: number;
  };
  transports: string[];
  sensors: Array<{ id: string; kind: string; rateHz?: number; deterministic?: boolean }>;
  actuators: Array<{
    id: string;
    kind: string;
    maxCommandRateHz?: number;
    maxForceN?: number;
    maxTorqueNm?: number;
    maxVelocity?: number;
    positionMin?: number;
    positionMax?: number;
  }>;
  safety: {
    emergencyStop: boolean;
    hardwareWatchdog: boolean;
    localSafetyLoop: boolean;
  };
  metadata?: Record<string, unknown>;
};

export type HardwareManifestIssue = {
  code: string;
  severity: "warning" | "blocker";
  message: string;
};

export type HardwareManifestReport = {
  passed: boolean;
  issues: HardwareManifestIssue[];
};

export class HardwareCapabilityManifestValidator {
  validate(manifest: HardwareCapabilityManifest): HardwareManifestReport {
    const issues: HardwareManifestIssue[] = [];
    if (!manifest.deviceId.trim()) issues.push({ code: "device-id-missing", severity: "blocker", message: "deviceId is required" });
    if (manifest.transports.length === 0) issues.push({ code: "transport-missing", severity: "blocker", message: "At least one hardware transport is required" });
    if (manifest.actuators.length === 0) issues.push({ code: "actuator-missing", severity: "warning", message: "No actuators are declared" });
    if (!manifest.safety.emergencyStop) issues.push({ code: "emergency-stop-missing", severity: "blocker", message: "A qualified physical deployment must expose emergency stop capability" });
    if (!manifest.safety.hardwareWatchdog) issues.push({ code: "hardware-watchdog-missing", severity: "blocker", message: "A qualified physical deployment must expose a hardware watchdog" });
    if (!manifest.safety.localSafetyLoop) issues.push({ code: "local-safety-loop-missing", severity: "blocker", message: "Safety-critical control cannot depend exclusively on remote cognition" });

    const duplicate = (items: { id: string }[]) => {
      const seen = new Set<string>();
      return items.find((item) => !item.id.trim() || seen.has(item.id) ? true : (seen.add(item.id), false));
    };
    if (duplicate(manifest.sensors)) issues.push({ code: "invalid-sensor-id", severity: "blocker", message: "Sensor IDs must be non-empty and unique" });
    if (duplicate(manifest.actuators)) issues.push({ code: "invalid-actuator-id", severity: "blocker", message: "Actuator IDs must be non-empty and unique" });

    for (const actuator of manifest.actuators) {
      if (actuator.positionMin !== undefined && actuator.positionMax !== undefined && actuator.positionMin >= actuator.positionMax) {
        issues.push({ code: "invalid-position-envelope", severity: "blocker", message: `Actuator ${actuator.id} has an invalid position envelope` });
      }
      for (const [name, value] of Object.entries({
        maxCommandRateHz: actuator.maxCommandRateHz,
        maxForceN: actuator.maxForceN,
        maxTorqueNm: actuator.maxTorqueNm,
        maxVelocity: actuator.maxVelocity
      })) {
        if (value !== undefined && (!Number.isFinite(value) || value <= 0)) {
          issues.push({ code: "invalid-actuator-limit", severity: "blocker", message: `Actuator ${actuator.id} has invalid ${name}` });
        }
      }
    }

    return { passed: !issues.some((issue) => issue.severity === "blocker"), issues };
  }
}
