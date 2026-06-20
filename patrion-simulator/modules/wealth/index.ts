export type WealthJourney = {
  currentWealth: number;
  targetWealth: number;
  missingWealth: number;
  nextWealthMilestone: { value: number; missingValue: number } | null;
  requiredProperties: number;
  requiredLetters: number;
};
