export type WealthMilestone = {
  value: number;
  missingValue: number;
};

export const wealthMilestones = [
  500000, 1000000, 2000000, 3000000, 5000000, 10000000,
] as const;

export const passiveIncomeMilestones = [
  2000, 5000, 10000, 20000, 50000,
] as const;

export function findNextMilestone(
  currentValue: number,
  milestones: readonly number[],
): WealthMilestone | null {
  const safeCurrentValue = Math.max(0, currentValue);
  const nextMilestone = milestones.find(
    (milestone) => milestone > safeCurrentValue,
  );

  if (!nextMilestone) {
    return null;
  }

  return {
    value: nextMilestone,
    missingValue: Math.max(0, nextMilestone - safeCurrentValue),
  };
}
