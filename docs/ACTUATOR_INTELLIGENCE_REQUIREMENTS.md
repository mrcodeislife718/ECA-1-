# ECA-1 Actuator Intelligence Requirements

ECA-1 does not replace actuator physics or certified low-level control. It adds a cognition-aware supervisory layer that can reason about actuator condition, limits, degradation, confidence, and recovery.

## Required actuator state model

Each actuator adapter should expose, when supported:

- position, velocity, acceleration, torque/force;
- command target and actual response;
- current, voltage, power, temperature;
- controller mode and fault state;
- encoder validity and calibration status;
- backlash/compliance estimate;
- vibration/health indicators;
- duty cycle and thermal headroom;
- command latency and acknowledgement timing;
- soft/hard limits;
- safe operating envelope;
- maintenance counters and lifecycle metadata;
- confidence/quality metadata for every estimate.

## Required ECA-1 behaviors

ECA-1 should be able to:

1. detect command-response divergence;
2. distinguish likely actuator, sensor, transport, model, and environment causes;
3. preserve competing causal hypotheses until evidence discriminates them;
4. reduce speed/force/acceleration under degraded confidence;
5. re-plan around unavailable or derated capabilities;
6. stop or escalate when the safety envelope cannot be established;
7. recognize thermal saturation trends before hard shutdown where telemetry permits;
8. detect persistent drift and trigger recalibration or maintenance workflow;
9. treat repeated limit-cycle/contact instability as a condition requiring controller/platform intervention rather than blindly retrying;
10. correlate actuator health with task context, payload, contact state, environment, and recent failures;
11. record every derating, denial, retry, stop, and recovery with evidence;
12. expose a maintenance-facing explanation of why a capability was derated or disabled.

## Command contract

Every physical command should carry:

- unique command ID;
- platform and actuator/capability identity;
- mission and authority context;
- creation time and deadline;
- sequence number / ordering domain;
- requested target and units;
- allowed tolerance;
- force/torque/speed/acceleration constraints where applicable;
- cancellation semantics;
- idempotency semantics;
- expected acknowledgement class;
- safety-envelope version;
- originating decision/evidence reference.

Stale, duplicated, unauthorized, out-of-order, or out-of-envelope commands must be rejected at the execution boundary.

## Actuator-health evidence

The qualification suite should include reproducible scenarios for:

- thermal rise and derating;
- intermittent encoder/sensor faults;
- stuck actuator;
- excessive lag;
- backlash/deadband increase;
- torque/force mismatch;
- transport delay and packet loss;
- duplicated/out-of-order commands;
- calibration drift;
- partial power degradation;
- degraded joint while mission is active;
- recovery to safe state after actuator loss.

Claims about predictive maintenance, fault isolation, compensation, or increased uptime require measured validation on representative hardware.
