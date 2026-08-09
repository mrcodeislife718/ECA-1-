export type ProductId =
  | "brain"
  | "industrial"
  | "edge"
  | "fleet"
  | "enterprise"
  | "oem"
  | "safety-recovery"
  | "integration";

export type PricingBasis = "robot-year" | "device" | "site-year" | "enterprise-year" | "royalty" | "module" | "project";

export type ProductDefinition = {
  id: ProductId;
  name: string;
  basis: PricingBasis;
  planningRangeUsd?: { min: number; max: number };
  recurring: boolean;
  includedCapabilities: string[];
  notes: string[];
};

/** Planning catalog only. These ranges are internal commercial assumptions,
 * not market facts or binding quotes. */
export const ECA1_PRODUCT_CATALOG: ProductDefinition[] = [
  {
    id: "brain",
    name: "ECA-1 Brain",
    basis: "robot-year",
    planningRangeUsd: { min: 3_000, max: 25_000 },
    recurring: true,
    includedCapabilities: ["universal-brain-runtime", "adaptation", "governed-action", "recovery", "learning"],
    notes: ["Base intelligence layer for qualified embodiments"]
  },
  {
    id: "industrial",
    name: "ECA-1 Industrial",
    basis: "robot-year",
    planningRangeUsd: { min: 15_000, max: 75_000 },
    recurring: true,
    includedCapabilities: ["industrial-recovery", "qualification", "audit", "degradation-monitoring", "edge-case-pack"],
    notes: ["For production environments with stricter operational requirements"]
  },
  {
    id: "edge",
    name: "ECA-1 Edge",
    basis: "device",
    planningRangeUsd: { min: 2_000, max: 15_000 },
    recurring: false,
    includedCapabilities: ["local-runtime-host", "low-latency-boundary", "robot-connectivity"],
    notes: ["Hardware pricing excludes recurring software entitlement"]
  },
  {
    id: "fleet",
    name: "ECA-1 Fleet",
    basis: "site-year",
    planningRangeUsd: { min: 100_000, max: 2_000_000 },
    recurring: true,
    includedCapabilities: ["fleet-control", "fleet-learning-validation", "deployment-management", "telemetry", "evidence"],
    notes: ["Scaled by site complexity and fleet size"]
  },
  {
    id: "enterprise",
    name: "ECA-1 Enterprise",
    basis: "enterprise-year",
    planningRangeUsd: { min: 500_000, max: 10_000_000 },
    recurring: true,
    includedCapabilities: ["multi-site", "enterprise-policy", "deployment-governance", "support", "analytics"],
    notes: ["Planning range only"]
  },
  {
    id: "oem",
    name: "ECA-1 OEM",
    basis: "royalty",
    recurring: true,
    includedCapabilities: ["embedded-brain", "activation", "manufacturing-profile", "field-update", "qualification"],
    notes: ["Per-unit royalty negotiated by OEM agreement"]
  },
  {
    id: "safety-recovery",
    name: "ECA-1 Safety, Recovery & Qualification",
    basis: "module",
    recurring: true,
    includedCapabilities: ["recovery", "qualification", "evidence", "edge-case-validation"],
    notes: ["Premium module surface"]
  },
  {
    id: "integration",
    name: "ECA-1 Integration",
    basis: "project",
    recurring: false,
    includedCapabilities: ["auto-integration", "driver-build", "commissioning", "qualification"],
    notes: ["Can be included, fixed-fee, or premium depending on complexity"]
  }
];

export function product(id: ProductId): ProductDefinition {
  const found = ECA1_PRODUCT_CATALOG.find((item) => item.id === id);
  if (!found) throw new Error(`Unknown ECA-1 product: ${id}`);
  return found;
}
