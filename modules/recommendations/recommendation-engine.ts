import type { ClientContext } from "@/modules/client-context";
import type {
  Recommendation,
  RecommendationCategory,
  RecommendationInput,
  RecommendationPriority,
} from "@/modules/recommendations/recommendation-types";
import type { WealthEvolutionInput } from "@/modules/wealth";

const priorityWeight: Record<RecommendationPriority, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

export function buildConsultativeRecommendations(
  input: RecommendationInput,
): Recommendation[] {
  const recommendations: Recommendation[] = [];

  if (!input.clientContext.nome.trim()) {
    recommendations.push(
      createRecommendation({
        id: "missing-client",
        category: "attention",
        priority: "high",
        text: "Cadastre o cliente atual para estruturar uma jornada patrimonial.",
      }),
    );
  }

  if (!input.activeStrategy) {
    recommendations.push(
      createRecommendation({
        id: "missing-strategy",
        category: "strategy",
        priority: "high",
        text: "Defina uma estrategia patrimonial antes de avancar novas simulacoes.",
      }),
    );
  }

  if (!input.latestSimulation) {
    recommendations.push(
      createRecommendation({
        id: "missing-simulation",
        category: "simulation",
        priority: "high",
        text: "Crie a primeira simulacao para projetar o caminho de evolucao patrimonial.",
      }),
    );
  }

  if (
    input.wealthProgress.targetValue > 0 &&
    input.wealthProgress.completionRate < 0.3
  ) {
    recommendations.push(
      createRecommendation({
        id: "early-wealth-journey",
        category: "wealth-growth",
        priority: "medium",
        text: "O cliente ainda esta no inicio da jornada patrimonial. Priorize estrategias de aquisicao e alavancagem.",
      }),
    );
  }

  if (
    input.passiveIncomeProgress.targetValue > 0 &&
    input.passiveIncomeProgress.completionRate < 0.3
  ) {
    recommendations.push(
      createRecommendation({
        id: "early-income-journey",
        category: "passive-income",
        priority: "medium",
        text: "A renda passiva ainda esta distante da meta. Avalie estrategias voltadas a geracao recorrente de caixa.",
      }),
    );
  }

  if (isNextMilestoneClose(input)) {
    recommendations.push(
      createRecommendation({
        id: "next-milestone-close",
        category: "wealth-growth",
        priority: "medium",
        text: "O cliente esta proximo de atingir o proximo marco patrimonial. Considere uma nova simulacao para acelerar a chegada.",
      }),
    );
  }

  if (requiresHighMonthlySpeed(input)) {
    recommendations.push(
      createRecommendation({
        id: "high-journey-speed",
        category: "attention",
        priority: "high",
        text: "A velocidade necessaria para atingir a meta no prazo exige uma estrategia mais agressiva ou revisao de prazo.",
      }),
    );
  }

  return recommendations.sort(sortRecommendations).slice(0, 5);
}

export function buildRecommendationWealthInput({
  clientContext,
  wealthInput,
}: {
  clientContext: ClientContext;
  wealthInput: WealthEvolutionInput;
}): WealthEvolutionInput {
  return {
    ...wealthInput,
    currentWealth:
      clientContext.patrimonioAtual > 0
        ? clientContext.patrimonioAtual
        : wealthInput.currentWealth,
    targetWealth:
      clientContext.metaPatrimonial > 0
        ? clientContext.metaPatrimonial
        : wealthInput.targetWealth,
    wealthGoalTermMonths:
      clientContext.prazoMeta > 0
        ? clientContext.prazoMeta
        : wealthInput.wealthGoalTermMonths,
    currentPassiveIncome:
      clientContext.rendaAtual > 0
        ? clientContext.rendaAtual
        : wealthInput.currentPassiveIncome,
    targetPassiveIncome:
      clientContext.metaRenda > 0
        ? clientContext.metaRenda
        : wealthInput.targetPassiveIncome,
    passiveIncomeGoalTermMonths:
      clientContext.prazoMeta > 0
        ? clientContext.prazoMeta
        : wealthInput.passiveIncomeGoalTermMonths,
  };
}

export function calculateRecommendationJourneySpeed({
  missingWealth,
  termMonths,
}: {
  missingWealth: number;
  termMonths: number;
}) {
  if (missingWealth <= 0 || termMonths <= 0) {
    return 0;
  }

  return missingWealth / termMonths;
}

function createRecommendation({
  category,
  id,
  priority,
  text,
}: {
  category: RecommendationCategory;
  id: string;
  priority: RecommendationPriority;
  text: string;
}): Recommendation {
  return { category, id, priority, text };
}

function isNextMilestoneClose(input: RecommendationInput) {
  const nextMilestone = input.wealthJourney.nextWealthMilestone;

  if (!nextMilestone || nextMilestone.value <= 0) {
    return false;
  }

  return nextMilestone.missingValue / nextMilestone.value < 0.2;
}

function requiresHighMonthlySpeed(input: RecommendationInput) {
  const currentWealth = input.wealthJourney.currentWealth;

  if (input.journeySpeed <= 0) {
    return false;
  }

  if (currentWealth <= 0) {
    return input.wealthJourney.missingWealth > 0;
  }

  return input.journeySpeed / currentWealth > 0.08;
}

function sortRecommendations(
  first: Recommendation,
  second: Recommendation,
) {
  return priorityWeight[second.priority] - priorityWeight[first.priority];
}
