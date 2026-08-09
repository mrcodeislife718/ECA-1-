# ECA-1 Universal Real-Time Embodiment Target

ECA-1 is being engineered as a universal robot brain that can operate across heterogeneous bodies, vendors, sensors, actuators, environments, and mission contexts while preserving the same cognitive and governance core.

## Human-responsive timing target

Human sensorimotor behavior does not have one single response latency. ECA-1 therefore does not use a vague claim of "human-speed cognition." It uses tiered, measurable response classes so the fastest safety and reflex paths always remain local.

Representative engineering targets:

```text
EVENT
  ↓
classify urgency + hazard
  ↓
┌─────────────────────────────────────┐
│ hardware emergency   target ~5 ms  │
│ reflex path          target ~20 ms │
│ sensorimotor path    target ~80 ms │
│ deliberative path    target ~250ms │
│ background           asynchronous  │
└─────────────────────────────────────┘
  ↓
FASTEST SAFE PATH
```

These are software timing objectives, not guarantees that every physical platform will achieve the same end-to-end latency. Sensor latency, actuator dynamics, operating-system scheduling, hardware, transport, and platform controllers remain part of the measured response path.

Emergency, reflex, and sensorimotor behavior must not require a network round trip.

## Real-time execution split

ECA-1 separates deeper cognition from deterministic physical control:

```text
ECA-1 COGNITION
      │
      ├── deeper reasoning
      ├── learning
      ├── planning
      └── recovery
              │
              ▼
       REAL-TIME FABRIC
              │
      ┌───────┴────────┐
      ▼                ▼
native/RT path      standard runtime
hard deadlines      normal cognition
```

The ECA-1 contract is independent from the implementation language of the hard real-time controller. Deployments requiring deterministic hard real time may terminate the same capability and safety contracts in a native or certified real-time controller without changing the cognitive architecture.

## Embodiment handshake

A robot does not enter ECA-1 primarily as a vendor or product identity. It enters as a set of validated capabilities, sensing channels, timing constraints, communication dependencies, and physical limits.

```text
UNKNOWN ROBOT BODY
       ↓
ECA-1 EMBODIMENT HANDSHAKE
       ↓
discover capabilities
       ↓
discover timing requirements
       ↓
discover communication dependencies
       ↓
compare against mission requirements
       ↓
build EmbodimentProfile
       ↓
READY / BLOCKED / DEGRADED
```

## Frictionless transition between embodiments

ECA-1 should preserve what remains valid when moving between robot bodies while refusing to copy body-specific assumptions blindly.

Preserved state can include:

- mission intent;
- world context;
- operator authority;
- relevant learned state;
- shared capabilities.

The target relationship is:

```text
same ECA-1
+ new embodiment contract
→ capability negotiation
→ continued mission
```

not:

```text
new robot
→ rewrite the brain
```

## Environment and situation adaptation

ECA-1 classifies operating context rather than pretending unfamiliar conditions are familiar:

```text
VALIDATED
BOUNDED-NOVEL
NOVEL
CONTRADICTORY
UNSAFE
```

The situation router combines environment state, discrepancy severity, authority, urgency, and state freshness:

```text
validated + normal
    → continue

bounded novelty
    → continue cautiously

novel
    → degrade / reason

contradictory evidence
    → diagnose

stale state
    → slow / refresh

unsafe
    → immediate stop
```

This is the intended meaning of free-flowing behavior: smooth adaptation without removing the boundaries required for physical safety.

## Universal operating target

```text
Universal Brain
+
Embodiment Handshake
+
Environment Adaptation
+
Tiered Real-Time Response
+
Independent Safety
+
Recovery
+
Learning
```

The desired onboarding path for a new robot is:

```text
NEW ROBOT APPEARS
      ↓
connect adapter
      ↓
ECA-1 discovers body
      ↓
capabilities negotiated
      ↓
timing envelope established
      ↓
safety envelope established
      ↓
environment assessed
      ↓
mission mapped
      ↓
shared skills reused
      ↓
missing skills identified
      ↓
ECA-1 operates
```

The objective is to minimize special-case engineering and avoid months of brain re-engineering for every new embodiment.

## Universal adaptation boundary

No engineering system can truthfully guarantee that every possible problem in every environment and embodiment will be solved in advance. ECA-1 therefore targets a stronger operational property:

> When ECA-1 encounters a new body, environment, failure, sensor configuration, constraint, or situation, it should minimize special-case engineering, discover what changed, preserve what remains valid, adapt within validated boundaries, respond using the fastest safe latency class, and degrade safely rather than collapse.

## Automatic embodiment adaptation

The next universalization layer is automatic embodiment adaptation.

ECA-1 should be capable of:

- observing a newly attached robot;
- constructing an initial body model;
- inferring controllable degrees of freedom from available evidence;
- discovering a capability graph;
- identifying dependencies between capabilities;
- proposing low-risk calibration experiments;
- establishing measured latency envelopes;
- establishing force envelopes where the embodiment exposes force-related capabilities;
- establishing energy envelopes where supported;
- distinguishing inferred capability from qualified capability;
- progressively qualifying capabilities through evidence;
- demoting or invalidating capabilities when evidence regresses;
- preserving uncertainty when a body property cannot yet be established.

The required progression is:

```text
UNKNOWN EMBODIMENT
      ↓
DISCOVERY
      ↓
INITIAL BODY MODEL
      ↓
CAPABILITY GRAPH
      ↓
SAFE CALIBRATION
      ↓
LATENCY / FORCE / ENERGY ENVELOPES
      ↓
PROGRESSIVE QUALIFICATION
      ↓
MISSION-ELIGIBLE CAPABILITIES
```

The architectural rule remains: inferred capability is not treated as physically validated capability until sufficient evidence supports promotion.

This is how ECA-1 moves toward a practical "connect ECA-1 to almost any robot" experience without sacrificing evidence, safety, or physical reality.