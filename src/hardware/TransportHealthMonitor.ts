import type { PhysicalEndpoint, PhysicalRobotDriver } from "./UniversalPhysicalRobotContract.js";

export type EndpointHealth = {
  endpointId: string;
  healthy: boolean;
  latencyMs?: number;
  local: boolean;
  deterministic?: boolean;
  reasons: string[];
};

export class TransportHealthMonitor {
  evaluate(endpoint: PhysicalEndpoint, observedLatencyMs?: number): EndpointHealth {
    const reasons: string[] = [];
    if (observedLatencyMs !== undefined && endpoint.maxRoundTripMs !== undefined && observedLatencyMs > endpoint.maxRoundTripMs) {
      reasons.push(`latency-exceeded:${observedLatencyMs}>${endpoint.maxRoundTripMs}`);
    }
    if (!endpoint.local && endpoint.role === "safety") reasons.push("remote-safety-endpoint");
    return {
      endpointId: endpoint.id,
      healthy: reasons.length === 0,
      local: endpoint.local,
      reasons,
      ...(observedLatencyMs !== undefined
        ? { latencyMs: observedLatencyMs }
        : {}),
      ...(endpoint.deterministic !== undefined
        ? { deterministic: endpoint.deterministic }
        : {})
    };
  }

  async driverHeartbeat(driver: PhysicalRobotDriver): Promise<{ healthy: boolean; timestamp: number; details?: Record<string, unknown> }> {
    if (!driver.heartbeat) return { healthy: true, timestamp: Date.now(), details: { heartbeat: "not-exposed" } };
    return driver.heartbeat();
  }
}
