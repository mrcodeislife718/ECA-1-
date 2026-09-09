export type ActuatorHealthObservation = {
  actuatorId: string;
  source: string;
  timestamp: number;
  confidence: number;
  temperatureC?: number;
  commandedTorqueNm?: number;
  measuredTorqueNm?: number;
  commandedPosition?: number;
  measuredPosition?: number;
  commandedVelocity?: number;
  measuredVelocity?: number;
  currentA?: number;
  voltageV?: number;
  vibrationRms?: number;
  calibrationError?: number;
};

export type ActuatorHealthLimits = {
  maxTemperatureC: number;
  maxTorqueErrorNm: number;
  maxPositionError: number;
  maxVelocityError: number;
  maxCurrentA?: number;
  maxVibrationRms?: number;
  maxCalibrationError?: number;
  maxObservationAgeMs: number;
};

export type ActuatorHealthState = "nominal" | "degraded" | "critical" | "unknown";

export type ActuatorHealthReport = {
  actuatorId: string;
  state: ActuatorHealthState;
  confidence: number;
  timestamp: number;
  reasons: string[];
  metrics: {
    maxTemperatureC: number;
    maxTorqueErrorNm: number;
    maxPositionError: number;
    maxVelocityError: number;
    maxCurrentA: number;
    maxVibrationRms: number;
    maxCalibrationError: number;
  };
};

export class ActuatorHealthFusion {
  constructor(private readonly limits: ActuatorHealthLimits) {
    const required = [
      limits.maxTemperatureC,
      limits.maxTorqueErrorNm,
      limits.maxPositionError,
      limits.maxVelocityError,
      limits.maxObservationAgeMs
    ];
    if (required.some((value) => !Number.isFinite(value) || value <= 0)) {
      throw new RangeError("actuator health limits must be finite positive values");
    }
  }

  evaluate(actuatorId: string, observations: ActuatorHealthObservation[], now = Date.now()): ActuatorHealthReport {
    const valid = observations.filter((item) =>
      item.actuatorId === actuatorId &&
      Number.isFinite(item.timestamp) &&
      item.timestamp <= now &&
      now - item.timestamp <= this.limits.maxObservationAgeMs &&
      Number.isFinite(item.confidence) &&
      item.confidence >= 0 &&
      item.confidence <= 1
    );

    if (valid.length === 0) {
      return {
        actuatorId,
        state: "unknown",
        confidence: 0,
        timestamp: now,
        reasons: ["no-fresh-actuator-observations"],
        metrics: {
          maxTemperatureC: 0,
          maxTorqueErrorNm: 0,
          maxPositionError: 0,
          maxVelocityError: 0,
          maxCurrentA: 0,
          maxVibrationRms: 0,
          maxCalibrationError: 0
        }
      };
    }

    const absDiff = (a?: number, b?: number) => a === undefined || b === undefined ? 0 : Math.abs(a - b);
    const max = (values: number[]) => values.length ? Math.max(...values) : 0;
    const metrics = {
      maxTemperatureC: max(valid.flatMap((item) => item.temperatureC === undefined ? [] : [item.temperatureC])),
      maxTorqueErrorNm: max(valid.map((item) => absDiff(item.commandedTorqueNm, item.measuredTorqueNm))),
      maxPositionError: max(valid.map((item) => absDiff(item.commandedPosition, item.measuredPosition))),
      maxVelocityError: max(valid.map((item) => absDiff(item.commandedVelocity, item.measuredVelocity))),
      maxCurrentA: max(valid.flatMap((item) => item.currentA === undefined ? [] : [Math.abs(item.currentA)])),
      maxVibrationRms: max(valid.flatMap((item) => item.vibrationRms === undefined ? [] : [Math.abs(item.vibrationRms)])),
      maxCalibrationError: max(valid.flatMap((item) => item.calibrationError === undefined ? [] : [Math.abs(item.calibrationError)]))
    };

    const reasons: string[] = [];
    const critical = [
      [metrics.maxTemperatureC, this.limits.maxTemperatureC, "temperature-limit"],
      [metrics.maxTorqueErrorNm, this.limits.maxTorqueErrorNm, "torque-tracking-error"],
      [metrics.maxPositionError, this.limits.maxPositionError, "position-tracking-error"],
      [metrics.maxVelocityError, this.limits.maxVelocityError, "velocity-tracking-error"],
      [metrics.maxCurrentA, this.limits.maxCurrentA, "current-limit"],
      [metrics.maxVibrationRms, this.limits.maxVibrationRms, "vibration-limit"],
      [metrics.maxCalibrationError, this.limits.maxCalibrationError, "calibration-drift"]
    ] as const;

    for (const [value, limit, reason] of critical) {
      if (limit !== undefined && value >= limit) reasons.push(reason);
    }

    const degraded = critical.some(([value, limit]) => limit !== undefined && value >= limit * 0.7);
    const confidence = valid.reduce((sum, item) => sum + item.confidence, 0) / valid.length;
    return {
      actuatorId,
      state: reasons.length ? "critical" : degraded ? "degraded" : "nominal",
      confidence,
      timestamp: now,
      reasons,
      metrics
    };
  }

  assertOperational(report: ActuatorHealthReport): void {
    if (report.state === "unknown") throw new Error("actuator-health-unknown");
    if (report.state === "critical") throw new Error(`actuator-health-critical:${report.reasons.join(",")}`);
  }
}
