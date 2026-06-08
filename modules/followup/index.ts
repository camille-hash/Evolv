export {
  buildFollowUpEvent,
  calculateDaysUntilEvent,
  sortEventsByDate,
  splitFollowUpEvents,
  summarizeFollowUpEvents,
} from "@/modules/followup/followup-engine";
export {
  deleteFollowUpEvent,
  FOLLOWUP_STORAGE_KEY,
  loadFollowUpEvents,
  saveFollowUpEvent,
  toggleFollowUpEventConclusion,
} from "@/modules/followup/followup-storage";
export type {
  FollowUpEvent,
  FollowUpEventDraft,
  FollowUpEventType,
  FollowUpNotificationSettings,
  FollowUpSummary,
} from "@/modules/followup/followup-types";
