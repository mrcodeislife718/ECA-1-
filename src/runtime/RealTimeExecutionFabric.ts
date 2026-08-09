import { HumanResponsiveLatency, type ResponseClass, type TimingMeasurement } from "./HumanResponsiveLatency.js";

export type RealTimeTask<T> = {
  id: string;
  responseClass: ResponseClass;
  requiresRemote?: boolean;
  run: () => T | Promise<T>;
};

export type RealTimeTaskResult<T> = {
  taskId: string;
  value: T;
  timing: TimingMeasurement;
};

/**
 * Execution boundary for ECA-1 latency-sensitive work.
 *
 * This class enforces dependency and deadline policy but JavaScript/Node itself
 * is not a hard-real-time environment. Deployments requiring certified hard
 * real-time guarantees should bind this contract to a real-time controller or
 * native runtime while keeping the ECA-1 cognitive API unchanged.
 */
export class RealTimeExecutionFabric {
  constructor(private readonly latency = new HumanResponsiveLatency()) {}

  async execute<T>(task: RealTimeTask<T>): Promise<RealTimeTaskResult<T>> {
    this.latency.assertNoRemoteDependency(task.responseClass, task.requiresRemote === true);
    const startedAt = Date.now();
    const value = await task.run();
    const timing = this.latency.measure(task.responseClass, startedAt);
    if (!timing.deadlineMet && task.responseClass !== "background") {
      throw new Error(`Timing deadline missed for ${task.id}: ${timing.elapsedMs}ms`);
    }
    return { taskId: task.id, value, timing };
  }
}
