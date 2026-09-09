export type ProductId =
  | "brain"
  | "industrial"
  | "edge"
  | "fleet"
  | "enterprise"
  | "oem"
  | "safety-recovery"
  | "integration";

export type ProductDefinition = {
  id: ProductId;
  name: string;
  includedCapabilities: string[];
};

export const ECA1_PRODUCT_CATALOG: ProductDefinition[] = [
  {
    id: "brain",
    name: "ECA-1 Brain",
    includedCapabilities: ["universal-brain-runtime", "adaptation", "governed-action", "recovery", "learning"]
  },
  {
    id: "industrial",
    name: "ECA-1 Industrial",
    includedCapabilities: ["industrial-recovery", "qualification", "audit", "degradation-monitoring", "edge-case-pack"]
  },
  {
    id: "edge",
    name: "ECA-1 Edge",
    includedCapabilities: ["local-runtime-host", "low-latency-boundary", "robot-connectivity"]
  },
  {
    id: "fleet",
    name: "ECA-1 Fleet",
    includedCapabilities: ["fleet-control", "fleet-learning-validation", "deployment-management", "telemetry", "evidence"]
  },
  {
    id: "enterprise",
    name: "ECA-1 Enterprise",
    includedCapabilities: ["multi-site", "enterprise-policy", "deployment-governance", "support", "analytics"]
  },
  {
    id: "oem",
    name: "ECA-1 OEM",
    includedCapabilities: ["embedded-brain", "activation", "manufacturing-profile", "field-update", "qualification"]
  },
  {
    id: "safety-recovery",
    name: "ECA-1 Safety & Recovery",
    includedCapabilities: ["recovery", "qualification", "evidence", "edge-case-validation"]
  },
  {
    id: "integration",
    name: "ECA-1 Integration",
    includedCapabilities: ["auto-integration", "driver-build", "commissioning", "qualification"]
  }
];

export function product(id: ProductId): ProductDefinition {
  const found = ECA1_PRODUCT_CATALOG.find((item) => item.id === id);
  if (!found) throw new Error(`Unknown ECA-1 product: ${id}`);
  return { ...found, includedCapabilities: [...found.includedCapabilities] };
}
