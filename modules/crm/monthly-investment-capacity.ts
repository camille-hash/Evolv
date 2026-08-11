export const monthlyInvestmentCapacityOptions = [
  "R$ 1.000 a R$ 2.000/mês",
  "R$ 2.000 a R$ 3.000/mês",
  "R$ 3.000 a R$ 5.000/mês",
  "Acima de R$ 5.000/mês",
] as const;

export type MonthlyInvestmentCapacity =
  (typeof monthlyInvestmentCapacityOptions)[number];

export type LeadMonthlyInvestmentCapacityProjection = {
  monthlyInvestmentCapacity: MonthlyInvestmentCapacity | null;
};

export function projectMonthlyInvestmentCapacity(
  value: unknown,
): MonthlyInvestmentCapacity | null {
  return typeof value === "string" &&
    monthlyInvestmentCapacityOptions.includes(
      value as MonthlyInvestmentCapacity,
    )
    ? value as MonthlyInvestmentCapacity
    : null;
}
