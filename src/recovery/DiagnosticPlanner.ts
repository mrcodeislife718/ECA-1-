import type { CandidateAction, Discrepancy } from "../contracts.js";
import type { CausalHypothesis } from "../cognition/CausalHypothesisManager.js";

export type DiagnosticCandidate = {
  id: string;
  action: CandidateAction;
  testsHypotheses: string[];
  expectedInformationGain: number;
  estimatedRisk: number;
  estimatedCost: number;
};

export type DiagnosticPlan = {
  discrepancyId: string;
  selected?: DiagnosticCandidate;
  rejected: Array<{ candidateId: string; reason: string }>;
};

export class DiagnosticPlanner {
  select(
    discrepancy: Discrepancy,
    hypotheses: CausalHypothesis[],
    candidates: DiagnosticCandidate[],
    limits: { maxRisk: number; maxCost: number }
  ): DiagnosticPlan {
    const active = new Set(
      hypotheses.filter((h) => h.status !== "rejected").map((h) => h.id)
    );

    const rejected: Array<{ candidateId: string; reason: string }> = [];
    const viable = candidates.filter((candidate) => {
      if (candidate.estimatedRisk > limits.maxRisk) {
        rejected.push({ candidateId: candidate.id, reason: "risk-limit" });
        return false;
      }
      if (candidate.estimatedCost > limits.maxCost) {
        rejected.push({ candidateId: candidate.id, reason: "cost-limit" });
        return false;
      }
      if (!candidate.testsHypotheses.some((id) => active.has(id))) {
        rejected.push({ candidateId: candidate.id, reason: "no-active-hypothesis-covered" });
        return false;
      }
      return true;
    });

    viable.sort((a, b) => {
      const aScore = a.expectedInformationGain - a.estimatedRisk - a.estimatedCost;
      const bScore = b.expectedInformationGain - b.estimatedRisk - b.estimatedCost;
      return bScore - aScore;
    });

    const selected = viable[0];

    return {
      discrepancyId: discrepancy.id,
      rejected,
      ...(selected ? { selected } : {})
    };
  }
}
