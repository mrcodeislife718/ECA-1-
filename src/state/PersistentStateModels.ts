import type { RobotState, SensorObservation } from "../contracts.js";

type StateEntry = { value: unknown; updatedAt: number; confidence: number; source: string };

export class PersistentStateModel {
  private readonly values = new Map<string, StateEntry>();

  update(key: string, value: unknown, source: string, confidence = 1, updatedAt = Date.now()): void {
    this.values.set(key, { value, source, confidence, updatedAt });
  }

  merge(record: Record<string, unknown>, source: string, confidence = 1, updatedAt = Date.now()): void {
    for (const [key, value] of Object.entries(record)) this.update(key, value, source, confidence, updatedAt);
  }

  get(key: string): StateEntry | undefined { return this.values.get(key); }

  snapshot(): Record<string, StateEntry> { return Object.fromEntries(this.values); }
}

export class BodyWorldState {
  readonly body = new PersistentStateModel();
  readonly world = new PersistentStateModel();

  ingestState(state: RobotState, source: string): void {
    this.body.merge(state.body, source, 1, state.timestamp);
    this.world.merge(state.world, source, 1, state.timestamp);
  }

  ingestObservations(observations: SensorObservation[]): void {
    for (const observation of observations) {
      const target = observation.kind.startsWith("body:") ? this.body : this.world;
      target.update(observation.kind, observation.data, observation.source, observation.confidence, observation.timestamp);
    }
  }
}
