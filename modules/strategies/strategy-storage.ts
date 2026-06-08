import {
  createStrategyFromDraft,
  duplicateStrategy,
  updateStrategyFromDraft,
} from "@/modules/strategies/strategy-engine";
import type { Strategy, StrategyDraft } from "@/modules/strategies/strategy-types";

export const STRATEGIES_STORAGE_KEY = "evolv.strategies.v1";

export function listStrategies(): Strategy[] {
  if (!canUseLocalStorage()) {
    return [];
  }

  const rawValue = window.localStorage.getItem(STRATEGIES_STORAGE_KEY);

  if (!rawValue) {
    return [];
  }

  try {
    const parsedValue = JSON.parse(rawValue);

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue
      .map(normalizeStrategy)
      .filter((strategy): strategy is Strategy => Boolean(strategy))
      .sort((first, second) => second.updatedAt.localeCompare(first.updatedAt));
  } catch {
    return [];
  }
}

export function saveStrategy({
  draft,
  id,
}: {
  draft: StrategyDraft;
  id?: string | null;
}) {
  const strategies = listStrategies();
  const existingStrategy = id
    ? strategies.find((strategy) => strategy.id === id)
    : undefined;
  const savedStrategy = existingStrategy
    ? updateStrategyFromDraft({ draft, strategy: existingStrategy })
    : createStrategyFromDraft({ draft });
  const nextStrategies = existingStrategy
    ? strategies.map((strategy) =>
        strategy.id === existingStrategy.id ? savedStrategy : strategy,
      )
    : [savedStrategy, ...strategies];

  persistStrategies(nextStrategies);

  return savedStrategy;
}

export function deleteStrategy(id: string) {
  const strategies = listStrategies().filter((strategy) => strategy.id !== id);

  persistStrategies(strategies);

  return strategies;
}

export function duplicateStoredStrategy(id: string) {
  const strategies = listStrategies();
  const sourceStrategy = strategies.find((strategy) => strategy.id === id);

  if (!sourceStrategy) {
    return null;
  }

  const newStrategy = duplicateStrategy(sourceStrategy);
  const nextStrategies = [newStrategy, ...strategies];

  persistStrategies(nextStrategies);

  return newStrategy;
}

function persistStrategies(strategies: Strategy[]) {
  if (!canUseLocalStorage()) {
    return;
  }

  window.localStorage.setItem(
    STRATEGIES_STORAGE_KEY,
    JSON.stringify(strategies),
  );
}

function normalizeStrategy(value: unknown): Strategy | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const strategy = value as Partial<Strategy>;

  if (
    !strategy.id ||
    !strategy.name ||
    !strategy.type ||
    !strategy.objective ||
    !strategy.createdAt ||
    !strategy.updatedAt
  ) {
    return null;
  }

  return {
    id: strategy.id,
    name: strategy.name,
    type: strategy.type,
    objective: strategy.objective,
    description: strategy.description ?? "",
    targetWealth: normalizeNumber(strategy.targetWealth),
    targetIncome: normalizeNumber(strategy.targetIncome),
    termMonths: normalizeTerm(strategy.termMonths),
    notes: strategy.notes ?? "",
    createdAt: strategy.createdAt,
    updatedAt: strategy.updatedAt,
  } as Strategy;
}

function normalizeNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : 0;
}

function normalizeTerm(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.trunc(value)
    : 120;
}

function canUseLocalStorage() {
  return typeof window !== "undefined" && "localStorage" in window;
}
