import type { WealthEvolutionInput } from "@/modules/wealth/progress";

export const WEALTH_EVOLUTION_STORAGE_KEY = "evolv.wealth.evolution.v1";

const emptyWealthEvolutionInput: WealthEvolutionInput = {
  currentWealth: 0,
  targetWealth: 0,
  wealthGoalTermMonths: 120,
  currentPassiveIncome: 0,
  targetPassiveIncome: 0,
  passiveIncomeGoalTermMonths: 120,
  averagePropertyValue: 0,
  averageLetterValue: 0,
};

export function loadWealthEvolutionInput(): WealthEvolutionInput {
  if (!canUseLocalStorage()) {
    return emptyWealthEvolutionInput;
  }

  const rawValue = window.localStorage.getItem(WEALTH_EVOLUTION_STORAGE_KEY);

  if (!rawValue) {
    return emptyWealthEvolutionInput;
  }

  try {
    return normalizeWealthEvolutionInput(JSON.parse(rawValue));
  } catch {
    return emptyWealthEvolutionInput;
  }
}

export function saveWealthEvolutionInput(input: WealthEvolutionInput) {
  const normalizedInput = normalizeWealthEvolutionInput(input);

  if (canUseLocalStorage()) {
    window.localStorage.setItem(
      WEALTH_EVOLUTION_STORAGE_KEY,
      JSON.stringify(normalizedInput),
    );
  }

  return normalizedInput;
}

function normalizeWealthEvolutionInput(value: unknown): WealthEvolutionInput {
  if (!value || typeof value !== "object") {
    return emptyWealthEvolutionInput;
  }

  const input = value as Partial<WealthEvolutionInput>;

  return {
    currentWealth: normalizePositiveNumber(input.currentWealth),
    targetWealth: normalizePositiveNumber(input.targetWealth),
    wealthGoalTermMonths: normalizeTerm(input.wealthGoalTermMonths),
    currentPassiveIncome: normalizePositiveNumber(input.currentPassiveIncome),
    targetPassiveIncome: normalizePositiveNumber(input.targetPassiveIncome),
    passiveIncomeGoalTermMonths: normalizeTerm(
      input.passiveIncomeGoalTermMonths,
    ),
    averagePropertyValue: normalizePositiveNumber(input.averagePropertyValue),
    averageLetterValue: normalizePositiveNumber(input.averageLetterValue),
  };
}

function normalizePositiveNumber(value: unknown) {
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
