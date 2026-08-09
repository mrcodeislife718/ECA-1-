import type { UseCaseEdgeCase, UseCaseProfile, UseCaseCriticality } from "./UseCaseProfile.js";

const severityRank: Record<UseCaseCriticality, number> = { low: 1, medium: 2, high: 3, critical: 4 };

function maxSeverity(a: UseCaseCriticality, b: UseCaseCriticality): UseCaseCriticality {
  return severityRank[a] >= severityRank[b] ? a : b;
}

export class UseCaseEdgeCaseGenerator {
  generate(profile: UseCaseProfile): UseCaseEdgeCase[] {
    const cases: UseCaseEdgeCase[] = [];
    const add = (edge: UseCaseEdgeCase) => {
      if (!cases.some((item) => item.id === edge.id)) cases.push(edge);
    };

    add({
      id: "state-staleness",
      category: "state",
      scenario: "Body, world, mission, or authority state becomes stale between observation and actuation.",
      whyItMatters: "A valid decision can become invalid before motion begins.",
      severity: maxSeverity("high", profile.criticality),
      detectionSignals: ["age-of-state", "clock-skew", "sequence-gap", "authority-version-change"],
      requiredResponse: ["invalidate-clearance", "refresh-state", "re-evaluate-action"],
      validationMethod: ["delay-injection", "clock-drift-test", "authority-change-during-action-test"]
    });

    add({
      id: "correlated-sensor-failure",
      category: "perception",
      scenario: "Multiple sensors become wrong together because of one shared cause.",
      whyItMatters: "Agreement between sensors is not proof when they share a failure source.",
      severity: maxSeverity("high", profile.criticality),
      detectionSignals: ["shared-power-domain", "shared-clock", "shared-network", "cross-modal-physics-mismatch"],
      requiredResponse: ["lower-confidence", "seek-independent-evidence", "degrade-if-unresolved"],
      validationMethod: ["shared-fault-injection", "power-domain-failure-test", "common-clock-failure-test"]
    });

    add({
      id: "actuator-degradation-during-success",
      category: "mechanical-health",
      scenario: "Tasks continue succeeding while wear, heat, backlash, vibration, or current draw worsens.",
      whyItMatters: "Task success can hide approaching mechanical failure.",
      severity: maxSeverity("high", profile.criticality),
      detectionSignals: ["current-trend", "temperature-trend", "vibration-trend", "backlash-trend", "latency-drift"],
      requiredResponse: ["accumulate-degradation", "reduce-envelope", "schedule-maintenance", "requalify-capability"],
      validationMethod: ["progressive-degradation-test", "wear-trend-replay", "thermal-soak-test"]
    });

    if (profile.humansPresent) {
      add({
        id: "unexpected-human-entry",
        category: "human-interaction",
        scenario: "A person enters, reaches into, blocks, rides, touches, or otherwise changes the robot's operating space unexpectedly.",
        whyItMatters: "Human behavior can invalidate a previously safe motion envelope instantly.",
        severity: "critical",
        detectionSignals: ["proximity-change", "vision-human-presence", "contact", "safety-zone-entry"],
        requiredResponse: ["fast-path-stop-or-slow", "invalidate-motion-clearance", "re-plan-with-human-present"],
        validationMethod: ["unexpected-entry-test", "occluded-human-test", "human-path-crossing-test"]
      });
    }

    if (profile.autonomyLevel !== "assistive") {
      add({
        id: "authority-loss-mid-mission",
        category: "authority",
        scenario: "Command authority, consent, lease, operator session, or mission authorization changes while the robot is active.",
        whyItMatters: "A previously permitted action may no longer be authorized.",
        severity: "critical",
        detectionSignals: ["authority-expiry", "operator-disconnect", "revocation-event", "lease-conflict"],
        requiredResponse: ["stop-privileged-action", "enter-safe-state-or-supervised-mode", "require-reauthorization"],
        validationMethod: ["revocation-mid-action-test", "operator-loss-test", "competing-authority-test"]
      });
    }

    if ((profile.connectivityAssumptions?.length ?? 0) > 0 || profile.autonomyLevel === "mixed" || profile.autonomyLevel === "supervised") {
      add({
        id: "uplink-degradation-or-loss",
        category: "communications",
        scenario: "Uplink experiences jitter, delay, packet loss, duplication, reordering, partition, or total loss.",
        whyItMatters: "Remote supervision must never become a hidden requirement for local physical safety.",
        severity: maxSeverity("high", profile.criticality),
        detectionSignals: ["heartbeat-loss", "round-trip-spike", "packet-reordering", "sequence-gap"],
        requiredResponse: ["keep-local-safety-active", "switch-to-qualified-offline-mode", "return-or-safe-state-if-required"],
        validationMethod: ["network-partition-test", "jitter-test", "packet-loss-test", "reordering-test"]
      });
    }

    for (const hazard of profile.environmentalHazards ?? []) {
      add({
        id: `environment:${hazard}`,
        category: "environment",
        scenario: `The use case encounters environmental hazard: ${hazard}.`,
        whyItMatters: "Environmental conditions can invalidate sensing, actuation, materials, traction, thermal, or electrical assumptions.",
        severity: maxSeverity("high", profile.criticality),
        detectionSignals: ["environment-monitoring", "sensor-confidence-change", "physical-response-deviation"],
        requiredResponse: ["reclassify-environment", "shrink-operating-envelope", "recalibrate-or-stop"],
        validationMethod: [`hazard-specific-test:${hazard}`, "boundary-condition-test", "recovery-test"]
      });
    }

    for (const task of profile.tasks) {
      add({
        id: `task-interruption:${task}`,
        category: "mission",
        scenario: `Task '${task}' is interrupted midway by a fault, dependency loss, obstruction, or emergency stop.`,
        whyItMatters: "Recovery depends on partial physical state, not merely restarting the command.",
        severity: profile.criticality,
        detectionSignals: ["task-progress", "actuation-result", "world-state-change", "dependency-health"],
        requiredResponse: ["capture-partial-state", "run-8-node-obstruction-analysis", "resume-rollback-or-safe-state"],
        validationMethod: [`mid-task-interruption:${task}`, `partial-state-recovery:${task}`]
      });
    }

    add({
      id: "unknown-unknown",
      category: "novelty",
      scenario: "Observed reality falls outside every known edge-case classification.",
      whyItMatters: "A universal robot brain must preserve uncertainty instead of forcing novelty into a familiar label.",
      severity: maxSeverity("high", profile.criticality),
      detectionSignals: ["unexplained-residual", "model-contradiction", "low-evidence", "new-dimension-detected"],
      requiredResponse: ["classify-as-unknown", "reduce-authority", "seek-information", "bound-experimentation", "safe-state-if-risk-high"],
      validationMethod: ["novel-fault-generation", "out-of-envelope-test", "unmodeled-dimension-test"]
    });

    return cases.sort((a, b) => severityRank[b.severity] - severityRank[a.severity]);
  }
}
