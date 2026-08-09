import { randomUUID } from "node:crypto";
import type { Discrepancy } from "../contracts.js";

export class DiscrepancyEngine {
  detect(
    expected: Record<string, unknown>,
    observed: Record<string, unknown>,
    magnitude: number,
    uncertainty: number,
    hypotheses: string[],
    hazard: Discrepancy["hazard"] = "low"
  ): Discrepancy | null {
    if (magnitude <= 0) return null;

    return {
      id: randomUUID(),
      expected,
      observed,
      magnitude,
      uncertainty: Math.min(1, Math.max(0, uncertainty)),
      hypotheses: [...new Set(hypotheses)],
      hazard,
      createdAt: Date.now()
    };
  }

  rankHypotheses(discrepancy: Discrepancy, evidenceWeights: Record<string, number>): string[] {
    return [...discrepancy.hypotheses].sort(
      (a, b) => (evidenceWeights[b] ?? 0) - (evidenceWeights[a] ?? 0)
    );
  }
}
