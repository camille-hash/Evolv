export type EvidenceType =
  | "lead_profile"
  | "timeline_event"
  | "task"
  | "note"
  | "simulation"
  | "multi_quota_study"
  | "check_point"
  | "knowledge_gap"
  | "executive_briefing"
  | "decision_output"
  | "missing_information"
  | "missing_next_action"
  | "missing_simulation";

export type EvidenceSource =
  | "lead"
  | "timeline"
  | "tasks"
  | "notes"
  | "simulations"
  | "multi_quota"
  | "check_points"
  | "knowledge_gaps"
  | "executive_briefing"
  | "decision_outputs";

export type EvidencePolarity =
  | "positive"
  | "neutral"
  | "negative"
  | "attention_required"
  | "missing";

export type EvidenceRelevance = "critical" | "high" | "medium" | "low";

export type SituationState =
  | "new_lead"
  | "active_negotiation"
  | "awaiting_follow_up"
  | "cooling_down"
  | "stalled"
  | "incomplete_context"
  | "low_signal";

export type SituationMomentum =
  | "accelerating"
  | "stable"
  | "cooling"
  | "stalled"
  | "unknown";

export type SituationPriority = "critical" | "high" | "medium" | "low";

export type RiskSeverity = "critical" | "high" | "medium" | "low";

export type OpportunityType =
  | "commercial_interest"
  | "follow_up_window"
  | "proposal_momentum"
  | "data_completion"
  | "relationship_signal";

export type ConflictSeverity = "high" | "medium" | "low";

export type AttentionLevel = "critical" | "high" | "medium" | "low" | "none";

export type CognitiveOperatorFamily =
  | "structural"
  | "semantic"
  | "reasoning"
  | "synthesis"
  | "infrastructure";

export type CognitiveArtifactFamily =
  | "raw"
  | "structural"
  | "semantic"
  | "executive"
  | "diagnostic";
