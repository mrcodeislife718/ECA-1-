import type { PlatformAdapter } from "../contracts.js";
import type { PhysicalRobotDriver } from "./UniversalPhysicalRobotContract.js";

/**
 * Bridges a real robot driver into the same PlatformAdapter contract used by
 * the ECA-1 brain. Simulation and hardware therefore share the brain/runtime
 * contract but remain distinct implementation surfaces.
 */
export class PhysicalRobotAdapter implements PlatformAdapter {
  readonly id: string;

  constructor(readonly driver: PhysicalRobotDriver) {
    this.id = "uninitialized-physical-robot";
  }

  private descriptorId?: string;

  async initialize(): Promise<this> {
    const descriptor = await this.driver.descriptor();
    this.descriptorId = descriptor.id;
    Object.defineProperty(this, "id", { value: descriptor.id, configurable: false, enumerable: true });
    return this;
  }

  capabilities() { return this.driver.capabilities(); }
  sense() { return this.driver.readSensors(); }
  snapshot() { return this.driver.readState(); }
  execute(action: Parameters<PlatformAdapter["execute"]>[0], clearance: Parameters<PlatformAdapter["execute"]>[1]) {
    return this.driver.writeAction(action, clearance);
  }
  emergencyStop(reason: string) { return this.driver.emergencyStop(reason); }

  async assertInitialized(): Promise<void> {
    if (!this.descriptorId) throw new Error("PhysicalRobotAdapter must be initialized before use");
  }
}
