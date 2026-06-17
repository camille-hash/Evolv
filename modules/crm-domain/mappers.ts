import type { CrmLead, CrmStageChange } from "../crm/crm-types";
import { buildGreenFlagDraftFromLead } from "./green-flags";
import { buildDualPipelineSnapshot } from "./pipeline-domain";
import { buildRevenueRecognitionSnapshot } from "./revenue-recognition";
import { buildStageEventDraftFromLegacyChange } from "./stage-events";
import type {
  CrmLeadDualPipelineSource,
  DualPipelineFutureLeadFields,
} from "./types";

export function mapCurrentCrmLeadToDomainSnapshot(
  lead: CrmLead,
  futureFields: DualPipelineFutureLeadFields = {},
) {
  return buildDualPipelineSnapshot(toDualPipelineSource(lead, futureFields));
}

export function mapCurrentCrmStageChangeToFutureStageEvent(input: {
  change: CrmStageChange;
  futureFields?: DualPipelineFutureLeadFields;
  lead: CrmLead;
  organizationId?: string | null;
}) {
  return buildStageEventDraftFromLegacyChange({
    change: input.change,
    lead: toDualPipelineSource(input.lead, input.futureFields),
    organizationId: input.organizationId,
  });
}

export function mapCurrentCrmLeadToFutureGreenFlag(input: {
  futureFields?: DualPipelineFutureLeadFields;
  lead: CrmLead;
  organizationId?: string | null;
}) {
  return buildGreenFlagDraftFromLead(
    toDualPipelineSource(input.lead, input.futureFields),
    { organizationId: input.organizationId },
  );
}

export function mapCurrentCrmLeadToRevenueRecognition(
  lead: CrmLead,
  futureFields: DualPipelineFutureLeadFields = {},
) {
  return buildRevenueRecognitionSnapshot(toDualPipelineSource(lead, futureFields));
}

function toDualPipelineSource(
  lead: CrmLead,
  futureFields: DualPipelineFutureLeadFields = {},
) {
  return {
    ...lead,
    ...futureFields,
  } satisfies CrmLeadDualPipelineSource;
}
