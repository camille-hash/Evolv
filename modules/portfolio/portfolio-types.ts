export type PortfolioProperty = {
  id: string;
  nome: string;
  valorAtual: number;
  rendaMensal: number;
  observacoes: string;
};

export type PortfolioLetter = {
  id: string;
  administradora: string;
  valorCredito: number;
  contemplada: boolean;
  observacoes: string;
};

export type PortfolioSnapshot = {
  properties: PortfolioProperty[];
  letters: PortfolioLetter[];
};

export type PortfolioConsolidation = {
  totalImoveis: number;
  totalCartas: number;
  patrimonioConsolidado: number;
  rendaPassivaConsolidada: number;
};

