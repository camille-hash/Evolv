export type WealthEvolutionInput = {
  currentWealth: number;
  targetWealth: number;
  wealthGoalTermMonths: number;
  currentPassiveIncome: number;
  targetPassiveIncome: number;
  passiveIncomeGoalTermMonths: number;
  averagePropertyValue: number;
  averageLetterValue: number;
};

export type WealthGoalProgress = {
  currentValue: number;
  targetValue: number;
  termMonths: number;
  completionRate: number;
};

export type WealthEvolution = {
  wealth: WealthGoalProgress;
  passiveIncome: WealthGoalProgress;
};

export function buildWealthEvolution(
  input: WealthEvolutionInput,
): WealthEvolution {
  return {
    wealth: buildGoalProgress({
      currentValue: input.currentWealth,
      targetValue: input.targetWealth,
      termMonths: input.wealthGoalTermMonths,
    }),
    passiveIncome: buildGoalProgress({
      currentValue: input.currentPassiveIncome,
      targetValue: input.targetPassiveIncome,
      termMonths: input.passiveIncomeGoalTermMonths,
    }),
  };
}

function buildGoalProgress({
  currentValue,
  targetValue,
  termMonths,
}: {
  currentValue: number;
  targetValue: number;
  termMonths: number;
}): WealthGoalProgress {
  const safeTargetValue = Math.max(0, targetValue);
  const completionRate =
    safeTargetValue > 0 ? Math.max(0, currentValue) / safeTargetValue : 0;

  return {
    currentValue: Math.max(0, currentValue),
    targetValue: safeTargetValue,
    termMonths: Math.max(1, Math.trunc(termMonths)),
    completionRate,
  };
}
