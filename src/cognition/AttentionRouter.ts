import type { SensorObservation } from "../contracts.js";

export type RoutedSignal = SensorObservation & { priority: number; route: string[] };

export class AttentionRouter {
  route(observations: SensorObservation[]): RoutedSignal[] {
    return observations
      .map((observation) => ({
        ...observation,
        priority: this.priority(observation),
        route: this.routesFor(observation)
      }))
      .sort((a, b) => b.priority - a.priority || b.timestamp - a.timestamp);
  }

  private priority(observation: SensorObservation): number {
    let score = observation.confidence * 50;
    if (observation.health === "failed") score += 100;
    else if (observation.health === "degraded") score += 60;
    if (/collision|force|temperature|fault|human|proximity|power/i.test(observation.kind)) score += 40;
    return score;
  }

  private routesFor(observation: SensorObservation): string[] {
    const routes = ["state", "memory"];
    if (/force|touch|proximity|collision|temperature|fault/i.test(observation.kind)) routes.push("safety", "recovery");
    if (observation.health !== "nominal") routes.push("diagnostics");
    return routes;
  }
}
