# ECA-1 Industrial Readiness Requirements

ECA-1 treats industrial readiness as a whole-system property rather than a benchmark score.

Recent assessments of large numbers of robotic foundation models reinforce an important deployment reality: industrial readiness remains fragmented when systems optimize isolated capabilities without integrating safety, real-time feasibility, perception, physical interaction, plant integration, and auditable deployment into one operating architecture.

ECA-1 therefore defines production readiness across all of these dimensions simultaneously.

> **A robot is not industrially ready because it performs well on an isolated benchmark. It is industrially ready only when perception, cognition, physical interaction, timing, safety, integration, recovery, evidence, and operator authority work together under real operating conditions.**

## 1. Integrated safety

Safety is not a post-processing filter around cognition.

Every physical action must remain inside an independent authorization path that includes mission authority, physical clearance, body state, human proximity, restricted zones, collision and reachability constraints, actuator limits, force and speed envelopes, thermal and power constraints, timeout behavior, cancellation, emergency-stop propagation, and safe-state recovery.

A candidate action may be intelligent and still be denied.

```text
Candidate Action
    ↓
Mission Authority
    ↓
Physical Clearance
    ↓
Safety Envelope
    ↓
Motion Gate
    ↓
Actuator Authorization
    ↓
Time-Bounded Command
    ↓
Continuous Monitoring
```

No cognitive component can grant itself physical authority.

## 2. Real-time feasibility

Physical systems continue moving while cognition runs. ECA-1 therefore separates hard safety timing from slower reasoning.

```text
Tier 0 — emergency and hard safety response
Tier 1 — deterministic physical control
Tier 2 — bounded local correction
Tier 3 — task-level reasoning and recovery
Tier 4 — deeper diagnosis, simulation, learning, fleet analysis
```

Higher-level cognition must never prevent lower-level safety response.

Every deployed capability should define:

- maximum acceptable decision latency;
- stale-state limits;
- command expiration;
- timeout behavior;
- fallback behavior;
- degraded-mode behavior;
- minimum sensing freshness;
- compute-resource requirements.

A system that cannot meet the required timing envelope must not silently continue as though it can.

## 3. Perception readiness

Industrial perception must be treated as uncertain, time-sensitive, multi-sensor evidence rather than assumed truth.

ECA-1 should maintain:

- sensor identity and provenance;
- calibration state;
- health state;
- freshness;
- uncertainty;
- contradiction score;
- dropout and saturation state;
- expected operating range;
- cross-sensor consistency;
- environmental conditions affecting reliability.

The world-state model must be capable of representing `unknown`, `contradictory`, `degraded`, and `out of validated envelope` rather than forcing uncertain observations into confident labels.

Sensor availability does not automatically imply sensor trust.

## 4. Physical interaction readiness

Industrial robots interact with contact, force, friction, compliance, mass, temperature, geometry, tooling, fixtures, moving objects, and people.

ECA-1 therefore evaluates more than visual or symbolic correctness.

Physical interaction state can include:

- expected contact phase;
- measured force and torque;
- position and orientation residuals;
- tactile and proximity evidence;
- payload and tool state;
- fixture state;
- thermal condition;
- permitted force and motion envelope;
- compliance and friction evidence;
- recovery options;
- uncertainty.

A task is not considered robust merely because the nominal trajectory succeeds. It must also be evaluated under controlled variation and discrepancy.

## 5. Integration readiness

A useful industrial robot brain must coexist with real factories, not require factories to become clean-room research environments.

ECA-1 separates cognition from platform and plant integration through explicit boundaries:

- sensor adapters;
- robot platform adapters;
- capability contracts;
- ROS-compatible interfaces;
- PLC and industrial-control integration boundaries where required;
- mission interfaces;
- operator interfaces;
- evidence and audit interfaces;
- safety-system boundaries;
- plant-system integration boundaries.

Existing certified safety systems remain authoritative where required.

A new robot body should require a validated platform contract and adapter, not a redesign of the cognitive architecture.

## 6. Auditable deployment

Production robotics needs reconstructable evidence of what happened.

ECA-1 should preserve a physical decision trace capable of answering:

```text
What did the robot observe?
What state did it infer?
What uncertainty existed?
What memory or prior evidence was used?
What explanations were considered?
What actions were proposed?
Which actions were rejected and why?
What action was authorized?
Who or what granted authority?
What command reached the actuator?
What did the body actually do?
What happened in the environment?
Was recovery attempted?
What was learned?
Was that learning promoted, rejected, or rolled back?
```

The trace must distinguish observed evidence from inferred explanation.

Auditability is part of operational control, incident investigation, validation, maintenance, learning governance, and customer trust.

## 7. Recovery readiness

Industrial readiness includes behavior after nominal execution fails.

ECA-1 therefore treats recovery as part of normal cognition:

```text
NORMAL
  ↓ anomaly
OBSERVE
  ↓
DIAGNOSE
  ↓
PROPOSE
  ↓
AUTHORIZE
  ↓
TEST / CORRECT
  ↓
VERIFY
  ├── success → RESUME
  ├── uncertain → DIAGNOSE
  ├── capability reduced → DEGRADED MODE
  ├── human decision required → REQUEST HELP
  └── unsafe / unrecoverable → SAFE STATE
```

Recovery must obey attempt limits, cumulative-force limits, time budgets, temperature limits, damage-risk thresholds, information-gain requirements, and escalation thresholds.

Repeated retries are not intelligence.

## 8. Validation readiness

Benchmark performance is useful evidence, but it is not deployment proof.

ECA-1 uses staged validation:

```text
SIMULATED
    ↓
HARDWARE-IN-LOOP
    ↓
CONTROLLED PHYSICAL TEST
    ↓
LIMITED DEPLOYMENT
    ↓
VALIDATED DEPLOYMENT
```

Promotion requires evidence. Unexpected divergence, regression, safety failure, or unresolved uncertainty can demote a capability.

Validation should include nominal operation and controlled disturbances such as:

- geometry changes;
- dimensional variation;
- friction changes;
- sensor degradation;
- contradictory sensors;
- calibration drift;
- fixture movement;
- thermal expansion;
- tool wear;
- actuator degradation;
- payload changes;
- changed lighting or camera pose;
- changed environment layout;
- previously unseen failure modes.

## 9. Industrial readiness scorecard

ECA-1 should not be declared production-ready from task success alone.

Readiness should be measured across at least:

- nominal task success;
- anomaly-detection latency;
- Mean Time To Autonomous Recovery (MTTAR);
- Autonomous Recovery Rate;
- Recurrence Prevention Rate;
- human interventions per operating hour;
- false recovery rate;
- safe-state correctness;
- damaged-part rate;
- repeated-failure frequency;
- perception confidence calibration;
- sensor-failure tolerance;
- timing deadline compliance;
- actuator authorization correctness;
- capability-demotion correctness;
- evidence-trace completeness;
- integration stability;
- recovery under distribution shift;
- transfer to related conditions;
- transfer across validated embodiments;
- learning rollback success;
- downtime avoided.

No single number should be allowed to hide a critical failure in another readiness dimension.

## 10. ECA-1 industrial readiness gate

A capability can be considered ready for industrial deployment only when all mandatory gates are satisfied:

```text
PERCEPTION VALIDATED
        +
TIMING VALIDATED
        +
PHYSICAL INTERACTION VALIDATED
        +
SAFETY AUTHORIZATION VALIDATED
        +
RECOVERY VALIDATED
        +
INTEGRATION VALIDATED
        +
AUDIT TRACE VALIDATED
        +
OPERATOR CONTROL VALIDATED
        +
REGRESSION TESTS PASSED
        ↓
INDUSTRIAL DEPLOYMENT ELIGIBLE
```

Failure of a mandatory gate blocks promotion regardless of benchmark performance elsewhere.

## Core industrial-readiness thesis

The central design rule is:

> **Industrial readiness is integrated readiness.**

A robot that perceives well but cannot meet timing requirements is not ready.

A robot that reasons well but cannot safely authorize motion is not ready.

A robot that manipulates well but cannot recover from realistic variation is not ready.

A robot that completes tasks but cannot explain or reconstruct its physical decisions is not ready.

A robot that performs well in simulation but cannot remain stable under physical drift is not ready.

A robot that works on one body but requires its cognition to be rebuilt for every platform is not a general industrial architecture.

ECA-1 is therefore designed around the entire deployment chain:

```text
PERCEIVE
    ↓
UNDERSTAND
    ↓
PREDICT
    ↓
PROPOSE
    ↓
AUTHORIZE
    ↓
ACT
    ↓
MONITOR
    ↓
RECOVER
    ↓
AUDIT
    ↓
LEARN
    ↓
REVALIDATE
```

The goal is not isolated robotic intelligence. The goal is dependable, governed physical intelligence that survives contact with production reality.