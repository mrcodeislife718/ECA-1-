export type RevenueScenarioInput = {
  deployedRobots: number;
  annualRevenuePerRobotUsd: number;
  sites?: number;
  annualRevenuePerSiteUsd?: number;
  enterpriseContracts?: number;
  annualRevenuePerEnterpriseUsd?: number;
  oemUnits?: number;
  annualRoyaltyPerOemUnitUsd?: number;
};

export type RevenueScenario = {
  robotArrUsd: number;
  siteArrUsd: number;
  enterpriseArrUsd: number;
  oemArrUsd: number;
  totalArrUsd: number;
};

export function projectAnnualRecurringRevenue(input: RevenueScenarioInput): RevenueScenario {
  const robotArrUsd = input.deployedRobots * input.annualRevenuePerRobotUsd;
  const siteArrUsd = (input.sites ?? 0) * (input.annualRevenuePerSiteUsd ?? 0);
  const enterpriseArrUsd = (input.enterpriseContracts ?? 0) * (input.annualRevenuePerEnterpriseUsd ?? 0);
  const oemArrUsd = (input.oemUnits ?? 0) * (input.annualRoyaltyPerOemUnitUsd ?? 0);
  return { robotArrUsd, siteArrUsd, enterpriseArrUsd, oemArrUsd, totalArrUsd: robotArrUsd + siteArrUsd + enterpriseArrUsd + oemArrUsd };
}

export type ValuationScenario = {
  arrUsd: number;
  revenueMultiple: number;
  impliedEnterpriseValueUsd: number;
  assumptions: string[];
};

/** Scenario calculator only; this is not an appraisal or market valuation. */
export function impliedValuation(arrUsd: number, revenueMultiple: number): ValuationScenario {
  if (arrUsd < 0 || revenueMultiple < 0) throw new Error("ARR and multiple must be non-negative");
  return {
    arrUsd,
    revenueMultiple,
    impliedEnterpriseValueUsd: arrUsd * revenueMultiple,
    assumptions: ["Illustrative scenario only", "Actual valuation depends on growth, margins, retention, defensibility, safety record, OEM penetration, and market conditions"]
  };
}

export const ECA1_SCALE_SCENARIOS = [
  { deployedRobots: 10_000, annualRevenuePerRobotUsd: 10_000 },
  { deployedRobots: 100_000, annualRevenuePerRobotUsd: 10_000 },
  { deployedRobots: 1_000_000, annualRevenuePerRobotUsd: 10_000 },
  { deployedRobots: 5_000_000, annualRevenuePerRobotUsd: 2_000 },
  { deployedRobots: 10_000_000, annualRevenuePerRobotUsd: 2_500 }
] as const;
