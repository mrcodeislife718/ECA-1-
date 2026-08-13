import type { Capability, PlatformAdapter, RobotState, SensorObservation } from "../contracts.js";
import type { PhysicalRobotDescriptor, PhysicalRobotDriver } from "../hardware/UniversalPhysicalRobotContract.js";
import { PhysicalRobotAdapter } from "../hardware/PhysicalRobotAdapter.js";

export type DiscoveredInterface = {
  id: string;
  role: string;
  transport: string;
  protocol?: string;
  local: boolean;
  deterministic?: boolean;
  confidence: number;
  evidence: string[];
};

export type InferredCapability = {
  id: string;
  confidence: number;
  evidence: string[];
  qualified: boolean;
};

export type AutoIntegrationReport = {
  robotId: string;
  descriptor: PhysicalRobotDescriptor;
  interfaces: DiscoveredInterface[];
  observations: SensorObservation[];
  state: RobotState;
  capabilities: InferredCapability[];
  safetySurfaces: string[];
  unknowns: string[];
  adapter: PlatformAdapter;
  status: "recognized" | "discovered" | "needs-calibration" | "blocked";
};

export type DriverFactory = {
  canHandle(input: unknown): boolean | Promise<boolean>;
  create(input: unknown): Promise<PhysicalRobotDriver>;
};

/**
 * UniversalAutoIntegration is the customer-facing path: connect a robot and let
 * ECA-1 discover as much as possible automatically. Discovery never grants
 * physical authority. Inference remains separate from qualification.
 */
export class UniversalAutoIntegration {
  private readonly factories: DriverFactory[] = [];

  registerFactory(factory: DriverFactory): void {
    this.factories.push(factory);
  }

  async connect(input: unknown): Promise<AutoIntegrationReport> {
    const factory = await this.resolveFactory(input);
    if (!factory) throw new Error("No compatible physical driver factory discovered");

    const driver = await factory.create(input);
    const [descriptor, observations, state, declared] = await Promise.all([
      driver.descriptor(),
      driver.readSensors(),
      driver.readState(),
      driver.capabilities()
    ]);

    const adapter = await new PhysicalRobotAdapter(driver).initialize();
    const interfaces: DiscoveredInterface[] = descriptor.endpoints.map((endpoint) => ({
      id: endpoint.id,
      role: endpoint.role,
      transport: endpoint.transport,
      local: endpoint.local,
      confidence: 1,
      evidence: ["physical-descriptor"],
      ...(endpoint.protocol !== undefined
        ? { protocol: endpoint.protocol }
        : {}),
      ...(endpoint.deterministic !== undefined
        ? { deterministic: endpoint.deterministic }
        : {})
    }));

    const capabilities = this.inferCapabilities(declared, observations, state);
    const safetySurfaces = descriptor.endpoints.filter((endpoint) => endpoint.role === "safety").map((endpoint) => endpoint.id);
    const unknowns: string[] = [];
    if (safetySurfaces.length === 0) unknowns.push("safety-surface-undiscovered");
    if (descriptor.endpoints.length === 0) unknowns.push("no-physical-endpoints");
    if (capabilities.length === 0) unknowns.push("no-capabilities-discovered");

    const blocked = descriptor.endpoints.some((endpoint) => endpoint.role === "safety" && !endpoint.local);
    return {
      robotId: descriptor.id,
      descriptor,
      interfaces,
      observations,
      state,
      capabilities,
      safetySurfaces,
      unknowns,
      adapter,
      status: blocked ? "blocked" : capabilities.every((capability) => capability.qualified) ? "recognized" : "needs-calibration"
    };
  }

  private async resolveFactory(input: unknown): Promise<DriverFactory | undefined> {
    for (const factory of this.factories) if (await factory.canHandle(input)) return factory;
    return undefined;
  }

  private inferCapabilities(declared: Capability[], observations: SensorObservation[], state: RobotState): InferredCapability[] {
    const sensorKinds = new Set(observations.map((observation) => observation.kind));
    return declared.map((capability) => {
      const evidence = ["driver-declaration"];
      if (sensorKinds.size > 0) evidence.push("live-sensor-observation");
      if (Object.keys(state.body).length > 0) evidence.push("live-body-state");
      return {
        id: capability.id,
        confidence: Math.min(0.79, 0.45 + evidence.length * 0.1),
        evidence,
        qualified: false
      };
    });
  }
}
