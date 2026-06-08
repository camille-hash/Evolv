export type StrategyType =
  | "wealth-growth"
  | "passive-income"
  | "accelerated"
  | "conservative";

export type Strategy = {
  id: string;
  name: string;
  type: StrategyType;
  objective: string;
  description: string;
  targetWealth: number;
  targetIncome: number;
  termMonths: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type StrategyDraft = {
  name: string;
  type: StrategyType;
  objective: string;
  description: string;
  targetWealth: number;
  targetIncome: number;
  termMonths: number;
  notes: string;
};

export type StrategyTemplate = {
  type: StrategyType;
  name: string;
  objective: string;
  description: string;
};

export const strategyTypeLabels: Record<StrategyType, string> = {
  "wealth-growth": "Estrategia Patrimonial",
  "passive-income": "Estrategia de Renda Passiva",
  accelerated: "Estrategia Acelerada",
  conservative: "Estrategia Conservadora",
};
