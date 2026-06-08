import type { ClientContext } from "@/modules/client-context";
import type { SimulatorSavedSimulation } from "@/modules/simulator";
import type { Strategy } from "@/modules/strategies";
import type { WealthGoalProgress, WealthJourney } from "@/modules/wealth";

export type RecommendationCategory =
  | "wealth-growth"
  | "passive-income"
  | "simulation"
  | "strategy"
  | "attention";

export type RecommendationPriority = "high" | "medium" | "low";

export type Recommendation = {
  id: string;
  category: RecommendationCategory;
  priority: RecommendationPriority;
  text: string;
};

export type RecommendationInput = {
  clientContext: ClientContext;
  activeStrategy: Strategy | null;
  latestSimulation: SimulatorSavedSimulation | null;
  wealthJourney: WealthJourney;
  wealthProgress: WealthGoalProgress;
  passiveIncomeProgress: WealthGoalProgress;
  journeySpeed: number;
};

export const recommendationCategoryLabels: Record<
  RecommendationCategory,
  string
> = {
  "wealth-growth": "Crescimento Patrimonial",
  "passive-income": "Renda Passiva",
  simulation: "Simulacao",
  strategy: "Estrategia",
  attention: "Atencao",
};

export const recommendationPriorityLabels: Record<
  RecommendationPriority,
  string
> = {
  high: "Alta",
  medium: "Media",
  low: "Baixa",
};

