export type ChallengeQuestion = {
  id: string;
  category: "assumption" | "invariant" | "dependency" | "timing" | "observation" | "authority" | "recovery" | "transfer";
  question: string;
  severity: "low" | "medium" | "high" | "critical";
};

export type ChallengeContext = {
  mission?: Record<string, unknown>;
  body?: Record<string, unknown>;
  world?: Record<string, unknown>;
  dependencies?: string[];
  assumptions?: string[];
  constraints?: string[];
};

export class UnknownUnknownsEngine {
  generate(context: ChallengeContext): ChallengeQuestion[] {
    const questions: ChallengeQuestion[] = [
      { id: "assumption-hidden", category: "assumption", severity: "high", question: "Which belief is currently treated as true without direct evidence?" },
      { id: "sensor-truth", category: "observation", severity: "high", question: "What if the sensors agree with each other but are all wrong for the same reason?" },
      { id: "missing-sensor", category: "observation", severity: "medium", question: "What relevant physical variable are we not measuring at all?" },
      { id: "timing-stale", category: "timing", severity: "critical", question: "What if the state was correct when measured but is stale when acted upon?" },
      { id: "dependency-loss", category: "dependency", severity: "critical", question: "What happens if a required dependency disappears halfway through the action?" },
      { id: "authority-change", category: "authority", severity: "critical", question: "What if authorization changes after planning but before or during execution?" },
      { id: "recovery-worse", category: "recovery", severity: "high", question: "Could the recovery action create a more dangerous state than the original failure?" },
      { id: "transfer-invalid", category: "transfer", severity: "high", question: "What hidden condition makes a previously learned recovery invalid on this body or environment?" },
      { id: "success-hides-damage", category: "invariant", severity: "high", question: "Could the mission appear successful while accumulating hidden damage, wear, drift, or unsafe state?" },
      { id: "partial-failure", category: "dependency", severity: "high", question: "What if a component is not failed, but degraded enough to corrupt downstream decisions?" },
      { id: "contradictory-objectives", category: "assumption", severity: "medium", question: "Are current mission incentives pushing against safety, quality, energy, or equipment longevity?" },
      { id: "unmodeled-actor", category: "observation", severity: "critical", question: "What if an unmodeled person, machine, object, or environmental force enters the system?" }
    ];

    for (const dependency of context.dependencies ?? []) {
      questions.push({
        id: `dependency:${dependency}`,
        category: "dependency",
        severity: "high",
        question: `What is the safe behavior if dependency '${dependency}' becomes unavailable, delayed, contradictory, or compromised?`
      });
    }

    for (const assumption of context.assumptions ?? []) {
      questions.push({
        id: `assumption:${assumption}`,
        category: "assumption",
        severity: "high",
        question: `How would ECA-1 detect that assumption '${assumption}' has become false?`
      });
    }

    return questions;
  }
}
