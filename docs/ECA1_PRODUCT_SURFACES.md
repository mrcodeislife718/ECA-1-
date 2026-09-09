# ECA-1 Product Surfaces

ECA-1 commercializes as an installable software platform first, with optional dedicated hardware later.

## ECA-1 Runtime

Production robot-brain runtime for perception routing, body/world state, memory, planning, prediction, governed action selection, recovery, and evidence.

## ECA-1 Platform SDK

Versioned contracts and conformance tooling for:

- platform identity and capabilities;
- sensors and calibration metadata;
- actuator commands and constraints;
- command deadlines, cancellation, sequencing, and acknowledgements;
- timing and clocks;
- telemetry and diagnostics;
- transports and fieldbus bridges;
- safety-state observation and escalation;
- simulation and replay adapters.

## ECA-1 Qualification Kit

- deterministic scenario runner;
- recorded-mission replay;
- fault injection;
- timing/jitter measurement;
- actuator/sensor degradation scenarios;
- disconnect/reconnect tests;
- stale and duplicated command tests;
- resource exhaustion tests;
- human override tests;
- degraded-mode qualification;
- hardware-in-the-loop adapter;
- signed qualification reports.

## ECA-1 Operations

- fleet inventory and compatibility matrix;
- health and telemetry collection;
- incident evidence bundles;
- versioned configuration;
- signed updates;
- staged rollout and rollback;
- support diagnostics;
- governed fleet-learning promotion.

## ECA-1 Reference Brain

A documented supported configuration using qualified third-party compute. This allows immediate deployment without waiting for custom ECA-1 hardware.

## ECA-1 Brain Module

Optional future hardware appliance built only after workload, I/O, thermal, power, reliability, and field-service requirements have been measured from real deployments.

The module may integrate production compute, hardware root of trust, independent supervisory MCU, watchdogs, networking/fieldbus interfaces, power/health monitoring, storage, service/debug interfaces, and ECA-1 Runtime. Safety-rated functions remain on certified safety components where required.

## Commercial principle

No customer must buy ECA-1 hardware to use ECA-1 software. Hardware increases deployment convenience and lifecycle revenue; it must not artificially reduce interoperability.
