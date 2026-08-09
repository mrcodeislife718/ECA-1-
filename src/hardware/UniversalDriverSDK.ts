import type {
  ActuationResult,
  CandidateAction,
  Capability,
  ClearanceDecision,
  RobotState,
  SensorObservation
} from "../contracts.js";
import { PhysicalRobotAdapter } from "./PhysicalRobotAdapter.js";
import type {
  PhysicalRobotDescriptor,
  PhysicalRobotDriver
} from "./UniversalPhysicalRobotContract.js";

export type UniversalDriverImplementation = {
  descriptor: () => Promise<PhysicalRobotDescriptor> | PhysicalRobotDescriptor;
  capabilities: () => Promise<Capability[]> | Capability[];
  readSensors: () => Promise<SensorObservation[]>;
  readState: () => Promise<RobotState>;
  writeAction: (action: CandidateAction, clearance: ClearanceDecision) => Promise<ActuationResult>;
  emergencyStop: (reason: string) => Promise<void>;
  heartbeat?: () => Promise<{ healthy: boolean; timestamp: number; details?: Record<string, unknown> }>;
  close?: () => Promise<void>;
};

export type DriverSDKBuildResult = {
  driver: PhysicalRobotDriver;
  adapter: PhysicalRobotAdapter;
};

/**
 * Manufacturer-facing construction surface for real robot drivers.
 * Vendors translate native APIs, buses, firmware, controllers, and SDKs into
 * this contract without modifying ECA-1 cognition.
 */
export class UniversalDriverSDK {
  build(implementation: UniversalDriverImplementation): PhysicalRobotDriver {
    return {
      descriptor: async () => implementation.descriptor(),
      capabilities: async () => implementation.capabilities(),
      readSensors: implementation.readSensors,
      readState: implementation.readState,
      writeAction: implementation.writeAction,
      emergencyStop: implementation.emergencyStop,
      heartbeat: implementation.heartbeat,
      close: implementation.close
    };
  }

  async connect(implementation: UniversalDriverImplementation): Promise<DriverSDKBuildResult> {
    const driver = this.build(implementation);
    const adapter = await new PhysicalRobotAdapter(driver).initialize();
    return { driver, adapter };
  }
}
