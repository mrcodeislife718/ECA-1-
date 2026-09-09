import type { ActuationResult, CandidateAction, ClearanceDecision } from "../contracts.js";
import type { PhysicalRobotDriver } from "./UniversalPhysicalRobotContract.js";

export type ActuationCommandEnvelope = {
  action: CandidateAction;
  clearance: ClearanceDecision;
  issuedAt: number;
  deadline: number;
  sequence: number;
  orderingDomain?: string;
};

export type CommandRejectionCode =
  | "clearance-denied"
  | "clearance-expired"
  | "invalid-deadline"
  | "deadline-expired"
  | "future-command"
  | "duplicate-command"
  | "out-of-order-command"
  | "unknown-capability";

export type CommandRejection = {
  code: CommandRejectionCode;
  reason: string;
  timestamp: number;
};

export type CommandGatewayOutcome =
  | { status: "executed"; result: ActuationResult }
  | { status: "rejected"; rejection: CommandRejection }
  | { status: "faulted"; fault: string; timestamp: number };

export type ActuationCommandGatewayOptions = {
  now?: () => number;
  maxFutureSkewMs?: number;
  maxRememberedCommandIds?: number;
};

/**
 * Enforces deterministic command-lifecycle rules immediately before a real
 * robot driver is allowed to receive a physical action.
 */
export class ActuationCommandGateway {
  private readonly now: () => number;
  private readonly maxFutureSkewMs: number;
  private readonly maxRememberedCommandIds: number;
  private readonly seen = new Set<string>();
  private readonly seenOrder: string[] = [];
  private readonly lastSequence = new Map<string, number>();

  constructor(
    private readonly driver: PhysicalRobotDriver,
    options: ActuationCommandGatewayOptions = {}
  ) {
    this.now = options.now ?? Date.now;
    this.maxFutureSkewMs = options.maxFutureSkewMs ?? 250;
    this.maxRememberedCommandIds = options.maxRememberedCommandIds ?? 10_000;

    if (!Number.isFinite(this.maxFutureSkewMs) || this.maxFutureSkewMs < 0) {
      throw new RangeError("maxFutureSkewMs must be a finite non-negative number");
    }
    if (!Number.isInteger(this.maxRememberedCommandIds) || this.maxRememberedCommandIds < 1) {
      throw new RangeError("maxRememberedCommandIds must be a positive integer");
    }
  }

  async execute(envelope: ActuationCommandEnvelope): Promise<CommandGatewayOutcome> {
    const now = this.now();
    const rejection = await this.validate(envelope, now);
    if (rejection) return { status: "rejected", rejection };

    const domain = envelope.orderingDomain ?? envelope.action.capability;
    this.remember(envelope.action.id);
    this.lastSequence.set(domain, envelope.sequence);

    try {
      const result = await this.driver.writeAction(envelope.action, envelope.clearance);
      return { status: "executed", result };
    } catch (error) {
      const fault = error instanceof Error ? error.message : String(error);
      return { status: "faulted", fault, timestamp: this.now() };
    }
  }

  sequenceFor(orderingDomain: string): number | undefined {
    return this.lastSequence.get(orderingDomain);
  }

  hasSeen(commandId: string): boolean {
    return this.seen.has(commandId);
  }

  resetOrderingDomain(orderingDomain: string): void {
    this.lastSequence.delete(orderingDomain);
  }

  private async validate(
    envelope: ActuationCommandEnvelope,
    now: number
  ): Promise<CommandRejection | undefined> {
    const { action, clearance, issuedAt, deadline, sequence } = envelope;

    if (!clearance.allowed) {
      return this.reject("clearance-denied", "Physical clearance does not authorize execution", now);
    }
    if (clearance.expiresAt <= now) {
      return this.reject("clearance-expired", "Physical clearance has expired", now);
    }
    if (!Number.isFinite(issuedAt) || !Number.isFinite(deadline) || deadline < issuedAt) {
      return this.reject("invalid-deadline", "Command deadline is invalid", now);
    }
    if (deadline <= now) {
      return this.reject("deadline-expired", "Command deadline has expired", now);
    }
    if (action.createdAt > now + this.maxFutureSkewMs || issuedAt > now + this.maxFutureSkewMs) {
      return this.reject("future-command", "Command timestamp exceeds permitted clock skew", now);
    }
    if (this.seen.has(action.id)) {
      return this.reject("duplicate-command", `Command ${action.id} has already crossed the execution boundary`, now);
    }
    if (!Number.isSafeInteger(sequence) || sequence < 0) {
      return this.reject("out-of-order-command", "Command sequence must be a non-negative safe integer", now);
    }

    const domain = envelope.orderingDomain ?? action.capability;
    const previous = this.lastSequence.get(domain);
    if (previous !== undefined && sequence <= previous) {
      return this.reject(
        "out-of-order-command",
        `Sequence ${sequence} does not advance ordering domain ${domain} beyond ${previous}`,
        now
      );
    }

    const capabilities = await this.driver.capabilities();
    if (!capabilities.some((capability) => capability.id === action.capability)) {
      return this.reject("unknown-capability", `Capability ${action.capability} is not exposed by the robot`, now);
    }

    return undefined;
  }

  private reject(code: CommandRejectionCode, reason: string, timestamp: number): CommandRejection {
    return { code, reason, timestamp };
  }

  private remember(commandId: string): void {
    this.seen.add(commandId);
    this.seenOrder.push(commandId);

    while (this.seenOrder.length > this.maxRememberedCommandIds) {
      const oldest = this.seenOrder.shift();
      if (oldest !== undefined) this.seen.delete(oldest);
    }
  }
}
