export {
  buildWealthEvolution,
  type WealthEvolution,
  type WealthEvolutionInput,
  type WealthGoalProgress,
} from "@/modules/wealth/progress";
export {
  buildWealthJourney,
  type WealthJourney,
} from "@/modules/wealth/journey";
export {
  buildMilestoneSteps,
  findNextMilestone,
  passiveIncomeMilestones,
  wealthMilestones,
  type WealthMilestone,
  type WealthMilestoneState,
  type WealthMilestoneStep,
} from "@/modules/wealth/milestones";
export {
  loadWealthEvolutionInput,
  saveWealthEvolutionInput,
  WEALTH_EVOLUTION_STORAGE_KEY,
} from "@/modules/wealth/storage";
