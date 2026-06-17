import type { CrmStageChange } from "../crm/crm-types";
import { buildDualPipelineSnapshot } from "./pipeline-domain";
import type {
  CrmLeadDualPipelineSource,
  CrmStageEventDraft,
  DualStageEventType,
} from "./types";

export function buildStageEventDraftFromLeadTransition(input: {
  lead: CrmLeadDualPipelineSource;
  fromPipeline: string;
  fromStage: string;
  toPipeline: string;
  toStage: string;
  actorProfileId?: string | null;
  eventType?: DualStageEventType;
  note?: string | null;
  occurredAt?: string;
  organizationId?: string | null;
}) {
  const fromSnapshot = buildDualPipelineSnapshot({
    ...input.lead,
    etapa: input.fromStage,
    pipeline: input.fromPipeline,
  });
  const toSnapshot = buildDualPipelineSnapshot({
    ...input.lead,
    etapa: input.toStage,
    pipeline: input.toPipeline,
  });
  const now = input.occurredAt ?? new Date().toISOString();

  return {
    organizationId: input.organizationId,
    leadId: input.lead.id,
    actorProfileId: input.actorProfileId ?? null,
    eventType: input.eventType ?? "manual_move",
    fromPipelineDomain: fromSnapshot.pipelineDomain,
    fromStageDomain: fromSnapshot.stageDomain,
    toPipelineDomain: toSnapshot.pipelineDomain,
    toStageDomain: toSnapshot.stageDomain,
    note: input.note ?? null,
    metadata: {
      currentPipeline: input.lead.pipeline,
      currentStage: input.lead.etapa,
      legacyFromPipeline: input.fromPipeline,
      legacyFromStage: input.fromStage,
      legacyToPipeline: input.toPipeline,
      legacyToStage: input.toStage,
    },
    occurredAt: now,
    createdAt: now,
  } satisfies CrmStageEventDraft;
}

export function buildStageEventDraftFromLegacyChange(input: {
  change: CrmStageChange;
  lead: CrmLeadDualPipelineSource;
  actorProfileId?: string | null;
  organizationId?: string | null;
}) {
  return buildStageEventDraftFromLeadTransition({
    actorProfileId: input.actorProfileId,
    fromPipeline: input.change.fromPipeline,
    fromStage: input.change.fromStage,
    lead: input.lead,
    occurredAt: input.change.createdAt,
    organizationId: input.organizationId,
    toPipeline: input.change.toPipeline,
    toStage: input.change.toStage,
  });
}

export function buildGreenFlagStageEventDraft(input: {
  lead: CrmLeadDualPipelineSource;
  actorProfileId?: string | null;
  note?: string | null;
  occurredAt?: string;
  organizationId?: string | null;
}) {
  return buildStageEventDraftFromLeadTransition({
    actorProfileId: input.actorProfileId,
    eventType: "green_flag_created",
    fromPipeline: input.lead.pipeline,
    fromStage: input.lead.etapa,
    lead: input.lead,
    note: input.note,
    occurredAt: input.occurredAt,
    organizationId: input.organizationId,
    toPipeline: "sales",
    toStage: "green-flag",
  });
}
