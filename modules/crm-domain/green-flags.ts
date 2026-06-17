import { buildDualPipelineSnapshot, isGreenFlagStageDomain } from "./pipeline-domain";
import type {
  CrmGreenFlagDraft,
  CrmLeadDualPipelineSource,
  GreenFlagStatus,
} from "./types";

export function buildGreenFlagDraftFromLead(
  lead: CrmLeadDualPipelineSource,
  options: {
    assignedProfileId?: string | null;
    createdByProfileId?: string | null;
    dueAt?: string | null;
    note?: string | null;
    organizationId?: string | null;
    resolutionReason?: string | null;
    resolvedAt?: string | null;
    resolvedByProfileId?: string | null;
    stageEventId?: string | null;
    status?: GreenFlagStatus;
  } = {},
) {
  const snapshot = buildDualPipelineSnapshot(lead);

  if (!isGreenFlagStageDomain(snapshot.stageDomain)) {
    return null;
  }

  const now = new Date().toISOString();
  const dueAt = options.dueAt ?? coerceLegacyDueAt(lead.dataProximaAcao);

  return {
    organizationId: options.organizationId,
    leadId: lead.id,
    stageEventId: options.stageEventId ?? null,
    createdByProfileId: options.createdByProfileId ?? null,
    assignedProfileId: options.assignedProfileId ?? null,
    resolvedByProfileId: options.resolvedByProfileId ?? null,
    status: options.status ?? "active",
    dueAt,
    note: options.note ?? null,
    context: lead.observacoes || null,
    resolutionReason: options.resolutionReason ?? null,
    resolvedAt: options.resolvedAt ?? null,
    metadata: {
      legacyPipeline: lead.pipeline,
      legacyStage: lead.etapa,
      legacyNextAction: lead.proximaAcao || null,
    },
    createdAt: now,
    updatedAt: now,
    source: "legacy-derived",
  } satisfies CrmGreenFlagDraft;
}

export function buildGreenFlagRescheduleDraft(input: {
  current: CrmGreenFlagDraft;
  dueAt: string;
  note?: string | null;
  resolutionReason?: string | null;
}) {
  return {
    ...input.current,
    dueAt: input.dueAt,
    note: input.note ?? input.current.note,
    resolutionReason: input.resolutionReason ?? input.current.resolutionReason,
    status: "rescheduled" as const,
    updatedAt: new Date().toISOString(),
  } satisfies CrmGreenFlagDraft;
}

function coerceLegacyDueAt(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return `${trimmed}T12:00:00.000Z`;
  }

  const parsed = new Date(trimmed);

  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}
