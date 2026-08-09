export type FaultScenario = {
  id: string;
  category: "sensor" | "actuator" | "timing" | "network" | "power" | "environment" | "authority" | "state" | "software" | "human";
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  inject(state: Record<string, unknown>): Record<string, unknown>;
  expectedResponse: "continue" | "degrade" | "recover" | "request-help" | "safe-state" | "emergency-stop";
};

export type FaultResult = {
  scenarioId: string;
  expectedResponse: FaultScenario["expectedResponse"];
  observedResponse: FaultScenario["expectedResponse"];
  passed: boolean;
};

export class FaultInjectionHarness {
  run(
    baseState: Record<string, unknown>,
    scenarios: FaultScenario[],
    evaluate: (state: Record<string, unknown>, scenario: FaultScenario) => FaultScenario["expectedResponse"]
  ): FaultResult[] {
    return scenarios.map((scenario) => {
      const injected = scenario.inject(structuredClone(baseState));
      const observedResponse = evaluate(injected, scenario);
      return {
        scenarioId: scenario.id,
        expectedResponse: scenario.expectedResponse,
        observedResponse,
        passed: observedResponse === scenario.expectedResponse
      };
    });
  }
}
