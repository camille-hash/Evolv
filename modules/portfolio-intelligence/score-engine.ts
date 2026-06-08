import type {
  PortfolioConcentration,
  PortfolioDependency,
  PortfolioExpansionPotential,
} from "@/modules/portfolio-intelligence/portfolio-intelligence";

export function calculatePortfolioScore({
  concentracao,
  dependenciaPatrimonial,
  eficienciaPatrimonial,
  potencialExpansao,
  wealthCompletionRate,
}: {
  concentracao: PortfolioConcentration;
  dependenciaPatrimonial: PortfolioDependency;
  eficienciaPatrimonial: number;
  potencialExpansao: PortfolioExpansionPotential;
  wealthCompletionRate: number;
}) {
  const progressScore = Math.min(Math.max(wealthCompletionRate, 0), 1) * 35;
  const passiveIncomeScore =
    dependenciaPatrimonial === "renda-passiva-presente" ? 20 : 0;
  const efficiencyScore = Math.min(Math.max(eficienciaPatrimonial, 0), 0.08) / 0.08 * 20;
  const diversificationScore =
    concentracao === "distribuicao-equilibrada" ? 15 : 8;
  const expansionScore =
    potencialExpansao === "cartas-nao-contempladas" ? 10 : 5;

  return Math.round(
    Math.min(
      100,
      progressScore +
        passiveIncomeScore +
        efficiencyScore +
        diversificationScore +
        expansionScore,
    ),
  );
}

