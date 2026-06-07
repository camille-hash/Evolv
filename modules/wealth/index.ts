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
  findNextMilestone,
  passiveIncomeMilestones,
  wealthMilestones,
  type WealthMilestone,
} from "@/modules/wealth/milestones";
export {
  loadWealthEvolutionInput,
  saveWealthEvolutionInput,
  WEALTH_EVOLUTION_STORAGE_KEY,
} from "@/modules/wealth/storage";
