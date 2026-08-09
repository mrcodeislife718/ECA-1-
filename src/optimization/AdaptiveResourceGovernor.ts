export type ResourceDemand = {
  id: string;
  priority: 0 | 1 | 2 | 3 | 4 | 5;
  compute: number;
  memory: number;
  bandwidth: number;
  deadlineMs: number;
  safetyCritical: boolean;
};

export type ResourceBudget = {
  compute: number;
  memory: number;
  bandwidth: number;
};

export type ResourceDecision = {
  admitted: string[];
  deferred: string[];
  rejected: string[];
};

export class AdaptiveResourceGovernor {
  allocate(demands: ResourceDemand[], budget: ResourceBudget): ResourceDecision {
    let compute = budget.compute;
    let memory = budget.memory;
    let bandwidth = budget.bandwidth;
    const admitted: string[] = [];
    const deferred: string[] = [];
    const rejected: string[] = [];

    const ordered = [...demands].sort((a, b) => {
      if (a.safetyCritical !== b.safetyCritical) return a.safetyCritical ? -1 : 1;
      if (a.priority !== b.priority) return a.priority - b.priority;
      return a.deadlineMs - b.deadlineMs;
    });

    for (const demand of ordered) {
      const fits = demand.compute <= compute && demand.memory <= memory && demand.bandwidth <= bandwidth;
      if (fits) {
        admitted.push(demand.id);
        compute -= demand.compute;
        memory -= demand.memory;
        bandwidth -= demand.bandwidth;
        continue;
      }
      if (demand.safetyCritical) rejected.push(demand.id);
      else deferred.push(demand.id);
    }

    return { admitted, deferred, rejected };
  }
}
