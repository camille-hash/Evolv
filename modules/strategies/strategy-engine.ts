import {
  strategyTypeLabels,
  type Strategy,
  type StrategyDraft,
  type StrategyTemplate,
  type StrategyType,
} from "@/modules/strategies/strategy-types";

export const strategyTemplates: StrategyTemplate[] = [
  {
    type: "wealth-growth",
    name: "Estrategia Patrimonial",
    objective: "Aumento de patrimonio total.",
    description:
      "Plano orientado a expansao gradual do patrimonio consolidado.",
  },
  {
    type: "passive-income",
    name: "Estrategia de Renda Passiva",
    objective: "Aumento da renda mensal.",
    description:
      "Plano voltado a construcao de renda recorrente ao longo do tempo.",
  },
  {
    type: "accelerated",
    name: "Estrategia Acelerada",
    objective: "Maximizar velocidade de crescimento.",
    description:
      "Plano focado em acelerar a evolucao patrimonial com maior intensidade.",
  },
  {
    type: "conservative",
    name: "Estrategia Conservadora",
    objective: "Reduzir risco e exposicao.",
    description:
      "Plano orientado a preservar previsibilidade e reduzir exposicao.",
  },
];

export function createStrategyDraftFromTemplate(
  type: StrategyType,
): StrategyDraft {
  const template = getStrategyTemplate(type);

  return {
    name: template.name,
    type: template.type,
    objective: template.objective,
    description: template.description,
    targetWealth: 0,
    targetIncome: 0,
    termMonths: 120,
    notes: "",
  };
}

export function createEmptyStrategyDraft(): StrategyDraft {
  return createStrategyDraftFromTemplate("wealth-growth");
}

export function createStrategyFromDraft({
  draft,
  id,
}: {
  draft: StrategyDraft;
  id?: string;
}): Strategy {
  const now = new Date().toISOString();

  return {
    ...normalizeStrategyDraft(draft),
    id: id ?? createStrategyId(),
    createdAt: now,
    updatedAt: now,
  };
}

export function updateStrategyFromDraft({
  draft,
  strategy,
}: {
  draft: StrategyDraft;
  strategy: Strategy;
}): Strategy {
  return {
    ...strategy,
    ...normalizeStrategyDraft(draft),
    updatedAt: new Date().toISOString(),
  };
}

export function duplicateStrategy(strategy: Strategy): Strategy {
  const now = new Date().toISOString();

  return {
    ...strategy,
    id: createStrategyId(),
    name: `${strategy.name} (copia)`,
    createdAt: now,
    updatedAt: now,
  };
}

export function normalizeStrategyDraft(draft: StrategyDraft): StrategyDraft {
  const template = getStrategyTemplate(draft.type);
  const trimmedName = draft.name.trim();

  return {
    name: trimmedName || strategyTypeLabels[draft.type],
    type: draft.type,
    objective: draft.objective.trim() || template.objective,
    description: draft.description.trim() || template.description,
    targetWealth: normalizePositiveNumber(draft.targetWealth),
    targetIncome: normalizePositiveNumber(draft.targetIncome),
    termMonths: normalizeTerm(draft.termMonths),
    notes: draft.notes.trim(),
  };
}

export function getStrategyTemplate(type: StrategyType) {
  return (
    strategyTemplates.find((template) => template.type === type) ??
    strategyTemplates[0]
  );
}

function normalizePositiveNumber(value: number) {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function normalizeTerm(value: number) {
  return Number.isFinite(value) && value > 0 ? Math.trunc(value) : 120;
}

function createStrategyId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
