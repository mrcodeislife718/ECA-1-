# ECA-1 Universal Adaptation and Edge-Case Hardening

ECA-1 is intended to preserve one governed cognitive core across heterogeneous robotic embodiments while adapting to differences in body, sensing, actuation, timing, environment, mission, and infrastructure.

The target is not to claim that every possible future condition can be predicted in advance. The target is to make unfamiliar conditions explicit, discover what changed, preserve what remains valid, re-qualify what does not transfer, adapt inside bounded evidence-backed limits, and fail safely when confidence or authority is insufficient.

## Universal transition target

```text
NEW OR CHANGED EMBODIMENT
        ↓
embodiment handshake
        ↓
capability discovery
        ↓
body/world continuity separation
        ↓
mission capability negotiation
        ↓
uncertainty propagation
        ↓
low-risk calibration planning
        ↓
latency / force / energy qualification
        ↓
environment and edge-case assessment
        ↓
mission-ready / degraded / blocked
        ↓
operate under fastest safe timing class
        ↓
monitor continuously
        ↓
recalibrate / diagnose / constrain / degrade / safe-state as required
```

## Required properties

ECA-1 should preserve mission intent, world context, operator authority, transferable learning, and evidence across compatible embodiment transitions while never blindly carrying forward joint maps, kinematics, force limits, actuator assumptions, timing assumptions, or other body-specific state.

Capability negotiation must happen before mission execution. Missing required capabilities, latency violations, unresolved physical constraints, stale state, invalid authority, or unqualified control paths can block or degrade a mission.

Uncertainty must propagate through adaptation rather than being reset to confidence at integration boundaries. Multiple uncertain dependencies compound uncertainty. Stale evidence is a first-class state.

Calibration should maximize useful information while respecting explicit risk, energy, time, prerequisite, and authority budgets. A discovered degree of freedom is not automatically a safe controllable degree of freedom.

Hot transitions between embodiments require fresh world state, valid authority, at least one transferable capability where continuity is expected, and requalification of body-specific capabilities before normal execution resumes.

## Edge-case adaptation modes

Unusual operating conditions are mapped into explicit modes:

```text
CONTINUE
CONSTRAIN
DIAGNOSE
RECALIBRATE
DEGRADE
REQUEST HELP
SAFE STATE
```

Critical hazards enter safe state. Authority anomalies require explicit escalation. Timing failures can force degraded operation. Unknown or low-confidence conditions trigger diagnosis rather than silent continuation. Sensor or actuator anomalies can force recalibration.

## Optimization principle

The optimization objective is not maximum cognition at every moment. It is the minimum safe friction required to continue useful operation.

ECA-1 should therefore prefer:

- local fast paths for immediate safety and sensorimotor control;
- cached validated capability knowledge where still fresh and embodiment-compatible;
- incremental requalification rather than full rediscovery when evidence supports continuity;
- low-risk high-information calibration probes;
- reuse of transferable learning while discarding body-specific assumptions;
- graceful degradation before total mission loss;
- explicit fallback capabilities;
- bounded compute, memory, communication, risk, energy, and recovery budgets;
- evidence-backed promotion from inferred to qualified capability;
- continuous latency and reliability measurement rather than static assumptions.

## Edge cases to continuously test

The verification surface should include at minimum:

- partial sensor loss and correlated sensor failure;
- contradictory sensor channels;
- stale world state between planning and actuation;
- actuator degradation during motion;
- hot-swapped tooling or payload changes;
- changed kinematics or control modes;
- communication degradation or total disconnect;
- compute and memory pressure;
- clock drift and deadline misses;
- authority revocation mid-mission;
- human entry into an operating zone;
- environment transition from validated to novel;
- calibration drift and thermal effects;
- energy depletion and power instability;
- capability disappearance mid-task;
- unexpected embodiment restart;
- partial platform adapter failure;
- duplicated or reordered messages;
- noisy or malicious uplink input;
- new geometry, friction, compliance, or load;
- mission transfer between unlike embodiments;
- requalification after maintenance or hardware replacement;
- recovery action that creates a second failure;
- repeated failures that consume recovery budget;
- successful task completion with accumulating hidden damage.

Every newly observed failure or near miss should become a replayable regression case where appropriate.

## Commercial operating target

The desired integration experience is:

```text
connect robot
    ↓
discover embodiment
    ↓
separate transferable from body-specific state
    ↓
negotiate mission capabilities
    ↓
run only the calibration needed
    ↓
qualify timing and physical envelopes
    ↓
reuse valid skills and learning
    ↓
operate
    ↓
adapt continuously when reality changes
```

The product objective is for a robotics manufacturer or operator to integrate ECA-1 without redesigning the cognitive core for each robot family. Platform-specific work should terminate at explicit adapters, contracts, validation evidence, and physical limits.

## Engineering rule

> ECA-1 should minimize embodiment-specific re-engineering, preserve valid continuity, expose uncertainty, adapt under evidence, re-qualify what changes, respond through the fastest safe path, and degrade safely instead of collapsing when reality leaves the expected envelope.
