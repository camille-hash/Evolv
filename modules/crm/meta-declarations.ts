import {
  projectMonthlyInvestmentCapacity,
  type MonthlyInvestmentCapacity,
} from "./monthly-investment-capacity.ts";

/**
 * Answer declared by the lead to the compound Meta question
 * "Você é Brasileiro e possui CPF?".
 *
 * "yes" means the lead declared both conditions as true.
 * "no" only negates the compound proposition and must not be interpreted
 * as hasCpf=false or as a separate statement about nationality.
 *
 * This value is independent from the lead's registered CPF and must never
 * populate, validate, or modify that field.
 */
export type DeclaredBrazilianAndCpfStatus = "yes" | "no";

export type LeadMetaDeclarations = {
  monthlyInvestmentCapacity: MonthlyInvestmentCapacity | null;
  declaredBrazilianAndCpfStatus: DeclaredBrazilianAndCpfStatus | null;
};

export function projectLeadMetaDeclarations(
  value: unknown,
): LeadMetaDeclarations {
  const monthlyInvestmentCapacity = isRecord(value)
    ? projectMonthlyInvestmentCapacity(value.monthly_investment_capacity)
    : null;
  const declaredBrazilianAndCpfStatus = isRecord(value) &&
      (value.declared_brazilian_and_cpf_status === "yes" ||
        value.declared_brazilian_and_cpf_status === "no")
    ? value.declared_brazilian_and_cpf_status
    : null;

  return {
    monthlyInvestmentCapacity,
    declaredBrazilianAndCpfStatus,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
