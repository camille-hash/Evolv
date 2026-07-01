import type { Dm001Decision, Dm001DecisionContextCategory } from "./contracts.ts";

export const DM001_MODEL_ID = "DM-001" as const;
export const DM001_MODEL_NAME = "Commercial Attention Allocation" as const;
export const DM001_MODEL_VERSION = "0.1.0-i1" as const;
export const DM001_CALIBRATION_STATUS = "INITIAL_DEFAULTS" as const;

export const DM001_RECOMMENDED_ACTIONS: Record<Dm001Decision, string> = {
  ACT_NOW: "Contato imediato",
  NURTURE: "Manter follow-up ativo",
  INVESTIGATE: "Identificar e trabalhar objecoes",
  WAIT: "Programar retorno na data adequada",
  DISENGAGE: "Encerrar acompanhamento ativo",
};

export const DM001_INITIAL_DEFAULT_WEIGHTS = {
  standardPositive: 1,
  continuityPositive: 2,
  timingPositive: 1,
  productFitPositive: 1,
  negative: -2,
  nonBlocking: 0,
} as const;

export const DM001_INITIAL_PRIORITY_THRESHOLDS = {
  actNow: 5,
  nurture: 2,
  disengage: -2,
} as const;

export const DM001_INITIAL_CONFIDENCE_THRESHOLDS = {
  highUsefulEvidence: 4,
  mediumUsefulEvidence: 2,
} as const;

export const DM001_CONTEXT_CATEGORIES: Dm001DecisionContextCategory[] = [
  "engagement",
  "continuity",
  "operationalReadiness",
  "productFit",
  "timing",
  "confidence",
];
