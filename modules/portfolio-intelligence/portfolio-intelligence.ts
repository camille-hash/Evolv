import type { PortfolioSnapshot } from "@/modules/portfolio";

export type PortfolioConcentration =
  | "alta-concentracao-imoveis"
  | "alta-concentracao-cartas"
  | "distribuicao-equilibrada";

export type PortfolioExpansionPotential =
  | "cartas-nao-contempladas"
  | "sem-expansao-identificada";

export type PortfolioDependency =
  | "ausencia-renda-passiva"
  | "renda-passiva-presente";

export type PortfolioIntelligenceInput = {
  snapshot: PortfolioSnapshot;
  wealthCompletionRate: number;
};

export type PortfolioIntelligence = {
  patrimonioTotal: number;
  percentualImoveis: number;
  percentualCartas: number;
  cartasContempladas: number;
  cartasNaoContempladas: number;
  rendaPassivaAnualizada: number;
  eficienciaPatrimonial: number;
  concentracao: PortfolioConcentration;
  potencialExpansao: PortfolioExpansionPotential;
  dependenciaPatrimonial: PortfolioDependency;
  evolvScore: number;
};

export const portfolioConcentrationLabels: Record<
  PortfolioConcentration,
  string
> = {
  "alta-concentracao-imoveis": "Alta concentracao em imoveis",
  "alta-concentracao-cartas": "Alta concentracao em cartas",
  "distribuicao-equilibrada": "Distribuicao equilibrada",
};

export const portfolioExpansionPotentialLabels: Record<
  PortfolioExpansionPotential,
  string
> = {
  "cartas-nao-contempladas": "Cartas nao contempladas com potencial futuro",
  "sem-expansao-identificada": "Sem expansao latente identificada",
};

export const portfolioDependencyLabels: Record<PortfolioDependency, string> = {
  "ausencia-renda-passiva": "Ausencia de renda passiva",
  "renda-passiva-presente": "Renda passiva presente",
};

