import {
  DM001_MODEL_ID,
  DM001_MODEL_VERSION,
} from "./constants.ts";
import type {
  CommercialAttentionDecision,
  Dm001Input,
} from "./contracts.ts";
import { executeCommercialAttentionAllocation } from "./executor.ts";
import type {
  CommercialAttentionDecisionStorage,
  PersistedCommercialAttentionDecision,
} from "./persistence.ts";
import {
  getLatestCommercialAttentionDecision,
  persistCommercialAttentionDecision,
} from "./persistence.ts";
import type {
  DecisionModelRegistry,
  RegisteredDecisionModel,
} from "../registry.ts";

export type CommercialAttentionRuntimeOptions = {
  persistedAt?: string;
  storage: CommercialAttentionDecisionStorage;
};

export type CommercialAttentionRuntimeResult = {
  decision: CommercialAttentionDecision;
  persistedDecision: PersistedCommercialAttentionDecision;
};

export const commercialAttentionAllocationDecisionModel: RegisteredDecisionModel<
  Dm001Input,
  CommercialAttentionDecision
> = {
  modelId: DM001_MODEL_ID,
  modelVersion: DM001_MODEL_VERSION,
  execute: executeCommercialAttentionAllocation,
};

export function registerCommercialAttentionAllocation(
  registry: DecisionModelRegistry,
): void {
  registry.register(commercialAttentionAllocationDecisionModel);
}

export async function executeRegisteredCommercialAttentionAllocation(
  input: Dm001Input,
  options: CommercialAttentionRuntimeOptions,
): Promise<CommercialAttentionRuntimeResult> {
  const decision = commercialAttentionAllocationDecisionModel.execute(input);
  const persistedDecision = await persistCommercialAttentionDecision(
    options.storage,
    {
      decision,
      leadId: input.leadId,
      organizationId: input.organizationId,
      persistedAt: options.persistedAt,
    },
  );

  return {
    decision,
    persistedDecision,
  };
}

export async function getLatestRegisteredCommercialAttentionAllocation(
  storage: CommercialAttentionDecisionStorage,
  params: {
    leadId: string;
    organizationId: string;
  },
): Promise<PersistedCommercialAttentionDecision | null> {
  return getLatestCommercialAttentionDecision(storage, {
    leadId: params.leadId,
    modelVersion: DM001_MODEL_VERSION,
    organizationId: params.organizationId,
  });
}
