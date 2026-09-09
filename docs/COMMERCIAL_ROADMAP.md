# ECA-1 Commercial Roadmap

## Phase 0 — Preserve and measure

- freeze claim discipline;
- preserve current architecture;
- inventory implemented vs documented capabilities;
- define supported compute and robot classes;
- establish baseline latency/resource/reliability measurements;
- define compatibility/version policy.

## Phase 1 — Installable runtime

- one-command or package-managed installation;
- production configuration schema;
- service lifecycle and health endpoints;
- structured logs, metrics, traces, and evidence IDs;
- persistent mission/checkpoint state;
- crash/restart recovery;
- signed/versioned configuration;
- local-first operation with optional cloud services.

## Phase 2 — Platform SDK

- stable capability, sensor, actuator, timing, telemetry, transport, and safety contracts;
- adapter conformance tests;
- reference adapters for representative robot/controller classes;
- capability discovery and negotiation;
- calibration metadata and compatibility checks;
- documented real-time boundary.

## Phase 3 — Physical execution hardening

- command IDs, deadlines, sequencing, cancellation, idempotency;
- stale/duplicate/out-of-order rejection;
- watchdog supervision;
- actuator health model and derating;
- fault classification and causal diagnosis;
- degraded modes and safe-state recovery;
- human override / authority revocation;
- non-bypassable physical authorization path.

## Phase 4 — Qualification

- deterministic simulation scenarios;
- mission replay;
- fault injection;
- HIL integration;
- latency/jitter/load measurements;
- long-duration soak and restart tests;
- actuator/sensor/network/power fault matrix;
- security abuse cases;
- signed evidence reports and release gates.

## Phase 5 — Operations and fleet

- fleet inventory;
- compatibility and health state;
- staged updates and rollback;
- incident evidence bundles;
- maintenance diagnostics;
- governed learning-artifact promotion;
- enterprise audit/export APIs.

## Phase 6 — Commercial package

- software editions and licensing;
- OEM/runtime licensing;
- support/SLA tiers;
- qualification/certification services;
- fleet subscription;
- enterprise procurement/security materials;
- reference hardware bill and supported configurations.

## Phase 7 — Optional ECA-1 Brain Module

Start only after production workloads define the real hardware requirements.

- compute/SOM selection;
- supervisory MCU and watchdog boundary;
- hardware root of trust;
- industrial networking/fieldbus interfaces;
- service/debug interfaces;
- power/thermal design;
- EMC/ESD and environmental targets;
- DFM/DFT and production test;
- lifecycle and component availability plan;
- certification strategy;
- field-replaceable design and support model.

## Release rule

No phase is considered complete because documentation says so. Completion requires executable implementation and reproducible evidence appropriate to the claim.
