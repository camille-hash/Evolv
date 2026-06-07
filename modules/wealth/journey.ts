import type { WealthEvolution, WealthEvolutionInput } from "@/modules/wealth/progress";
import {
  findNextMilestone,
  passiveIncomeMilestones,
  wealthMilestones,
  type WealthMilestone,
} from "@/modules/wealth/milestones";

export type WealthJourney = {
  currentWealth: number;
  targetWealth: number;
  missingWealth: number;
  completionRate: number;
  remainingRate: number;
  nextWealthMilestone: WealthMilestone | null;
  averagePropertyValue: number;
  requiredProperties: number;
  averageLetterValue: number;
  requiredLetters: number;
  currentPassiveIncome: number;
  targetPassiveIncome: number;
  missingPassiveIncome: number;
  nextPassiveIncomeMilestone: WealthMilestone | null;
};

export function buildWealthJourney({
  evolution,
  input,
}: {
  evolution: WealthEvolution;
  input: WealthEvolutionInput;
}): WealthJourney {
  const missingWealth = Math.max(
    0,
    evolution.wealth.targetValue - evolution.wealth.currentValue,
  );
  const missingPassiveIncome = Math.max(
    0,
    evolution.passiveIncome.targetValue -
      evolution.passiveIncome.currentValue,
  );
  const completionRate = Math.max(0, evolution.wealth.completionRate);

  return {
    currentWealth: evolution.wealth.currentValue,
    targetWealth: evolution.wealth.targetValue,
    missingWealth,
    completionRate,
    remainingRate: Math.max(0, 1 - Math.min(completionRate, 1)),
    nextWealthMilestone: findNextMilestone(
      evolution.wealth.currentValue,
      wealthMilestones,
    ),
    averagePropertyValue: Math.max(0, input.averagePropertyValue),
    requiredProperties: calculateRequiredUnits(
      missingWealth,
      input.averagePropertyValue,
    ),
    averageLetterValue: Math.max(0, input.averageLetterValue),
    requiredLetters: calculateRequiredUnits(
      missingWealth,
      input.averageLetterValue,
    ),
    currentPassiveIncome: evolution.passiveIncome.currentValue,
    targetPassiveIncome: evolution.passiveIncome.targetValue,
    missingPassiveIncome,
    nextPassiveIncomeMilestone: findNextMilestone(
      evolution.passiveIncome.currentValue,
      passiveIncomeMilestones,
    ),
  };
}

function calculateRequiredUnits(missingValue: number, averageValue: number) {
  if (missingValue <= 0 || averageValue <= 0) {
    return 0;
  }

  return Math.ceil(missingValue / averageValue);
}
