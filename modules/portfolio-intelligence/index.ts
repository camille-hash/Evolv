import type { PortfolioSnapshot } from "@/modules/portfolio";
import {
  calculatePortfolioScore,
} from "@/modules/portfolio-intelligence/score-engine";
import {
  portfolioConcentrationLabels,
  portfolioDependencyLabels,
  portfolioExpansionPotentialLabels,
  type PortfolioConcentration,
  type PortfolioDependency,
  type PortfolioExpansionPotential,
  type PortfolioIntelligence,
  type PortfolioIntelligenceInput,
} from "@/modules/portfolio-intelligence/portfolio-intelligence";

export function buildPortfolioIntelligence({
  snapshot,
  wealthCompletionRate,
}: PortfolioIntelligenceInput): PortfolioIntelligence {
  const patrimonioImoveis = snapshot.properties.reduce(
    (total, property) => total + Math.max(0, property.valorAtual),
    0,
  );
  const patrimonioCartas = snapshot.letters.reduce(
    (total, letter) => total + Math.max(0, letter.valorCredito),
    0,
  );
  const patrimonioTotal = patrimonioImoveis + patrimonioCartas;
  const percentualImoveis =
    patrimonioTotal > 0 ? patrimonioImoveis / patrimonioTotal : 0;
  const percentualCartas =
    patrimonioTotal > 0 ? patrimonioCartas / patrimonioTotal : 0;
  const cartasContempladas = snapshot.letters.filter(
    (letter) => letter.contemplada,
  ).length;
  const cartasNaoContempladas = snapshot.letters.length - cartasContempladas;
  const rendaPassivaMensal = snapshot.properties.reduce(
    (total, property) => total + Math.max(0, property.rendaMensal),
    0,
  );
  const rendaPassivaAnualizada = rendaPassivaMensal * 12;
  const eficienciaPatrimonial =
    patrimonioTotal > 0 ? rendaPassivaAnualizada / patrimonioTotal : 0;
  const concentracao = detectConcentration({
    percentualCartas,
    percentualImoveis,
  });
  const potencialExpansao = detectExpansionPotential(snapshot);
  const dependenciaPatrimonial = detectDependency(rendaPassivaMensal);

  return {
    patrimonioTotal,
    percentualImoveis,
    percentualCartas,
    cartasContempladas,
    cartasNaoContempladas,
    rendaPassivaAnualizada,
    eficienciaPatrimonial,
    concentracao,
    potencialExpansao,
    dependenciaPatrimonial,
    evolvScore: calculatePortfolioScore({
      concentracao,
      dependenciaPatrimonial,
      eficienciaPatrimonial,
      potencialExpansao,
      wealthCompletionRate,
    }),
  };
}

function detectConcentration({
  percentualCartas,
  percentualImoveis,
}: {
  percentualCartas: number;
  percentualImoveis: number;
}): PortfolioConcentration {
  if (percentualImoveis >= 0.7) {
    return "alta-concentracao-imoveis";
  }

  if (percentualCartas >= 0.7) {
    return "alta-concentracao-cartas";
  }

  return "distribuicao-equilibrada";
}

function detectExpansionPotential(
  snapshot: PortfolioSnapshot,
): PortfolioExpansionPotential {
  return snapshot.letters.some((letter) => !letter.contemplada)
    ? "cartas-nao-contempladas"
    : "sem-expansao-identificada";
}

function detectDependency(rendaPassivaMensal: number): PortfolioDependency {
  return rendaPassivaMensal > 0
    ? "renda-passiva-presente"
    : "ausencia-renda-passiva";
}

export {
  portfolioConcentrationLabels,
  portfolioDependencyLabels,
  portfolioExpansionPotentialLabels,
};
export type {
  PortfolioConcentration,
  PortfolioDependency,
  PortfolioExpansionPotential,
  PortfolioIntelligence,
  PortfolioIntelligenceInput,
};

