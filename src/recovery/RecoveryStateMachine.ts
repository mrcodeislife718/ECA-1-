export type RecoveryState = "normal" | "observe" | "diagnose" | "propose" | "authorize" | "test" | "verify" | "resume" | "degraded" | "request-help" | "safe-state";

const allowed: Record<RecoveryState, RecoveryState[]> = {
  normal: ["observe"], observe: ["diagnose", "safe-state"], diagnose: ["propose", "request-help", "safe-state"],
  propose: ["authorize", "diagnose"], authorize: ["test", "diagnose", "safe-state"], test: ["verify", "safe-state"],
  verify: ["resume", "diagnose", "degraded", "request-help", "safe-state"], resume: ["normal"], degraded: ["normal", "request-help", "safe-state"],
  "request-help": ["diagnose", "safe-state", "normal"], "safe-state": ["normal"]
};

export class RecoveryStateMachine {
  private current: RecoveryState = "normal";
  private attempts = 0;
  constructor(private readonly maxAttempts = 3) {}
  state(): RecoveryState { return this.current; }
  transition(next: RecoveryState): RecoveryState {
    if (!allowed[this.current].includes(next)) throw new Error(`Invalid recovery transition ${this.current} -> ${next}`);
    if (next === "test") {
      this.attempts += 1;
      if (this.attempts > this.maxAttempts) { this.current = "request-help"; return this.current; }
    }
    if (next === "normal") this.attempts = 0;
    this.current = next;
    return this.current;
  }
}
