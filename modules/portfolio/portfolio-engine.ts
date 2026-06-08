import type {
  PortfolioConsolidation,
  PortfolioSnapshot,
} from "@/modules/portfolio/portfolio-types";

export function consolidatePortfolio(
  snapshot: PortfolioSnapshot,
): PortfolioConsolidation {
  const totalPropertiesValue = snapshot.properties.reduce(
    (total, property) => total + Math.max(0, property.valorAtual),
    0,
  );
  const totalLettersValue = snapshot.letters.reduce(
    (total, letter) => total + Math.max(0, letter.valorCredito),
    0,
  );
  const passiveIncome = snapshot.properties.reduce(
    (total, property) => total + Math.max(0, property.rendaMensal),
    0,
  );

  return {
    totalImoveis: snapshot.properties.length,
    totalCartas: snapshot.letters.length,
    patrimonioConsolidado: totalPropertiesValue + totalLettersValue,
    rendaPassivaConsolidada: passiveIncome,
  };
}

