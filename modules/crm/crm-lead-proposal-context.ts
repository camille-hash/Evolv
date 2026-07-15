const CRM_LEAD_PROPOSAL_CONTEXT_KEY = "evolv.crm.lead-proposal-context.v1";

export type CrmLeadProposalContext = {
  intent: "simulation" | "proposal" | "multi_cotas";
  leadId: string;
  leadName: string;
  leadDesiredCredit?: number;
  responsibleName?: string;
  commercialContext?: {
    pipeline?: string;
    stage?: string;
    status?: string;
    temperature?: string;
  };
  createdAt: string;
};

export function saveCrmLeadProposalContext(input: {
  intent: "simulation" | "proposal" | "multi_cotas";
  leadId: string;
  leadName: string;
  leadDesiredCredit?: number;
  responsibleName?: string;
  commercialContext?: CrmLeadProposalContext["commercialContext"];
}): CrmLeadProposalContext {
  const context: CrmLeadProposalContext = {
    intent: input.intent,
    leadId: input.leadId,
    leadName: input.leadName,
    leadDesiredCredit:
      typeof input.leadDesiredCredit === "number" &&
      Number.isFinite(input.leadDesiredCredit) &&
      input.leadDesiredCredit > 0
        ? input.leadDesiredCredit
        : undefined,
    responsibleName:
      typeof input.responsibleName === "string" && input.responsibleName.trim()
        ? input.responsibleName.trim()
        : undefined,
    commercialContext: normalizeCommercialContext(input.commercialContext),
    createdAt: new Date().toISOString(),
  };

  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.setItem(
        CRM_LEAD_PROPOSAL_CONTEXT_KEY,
        JSON.stringify(context),
      );
    } catch {
      // The in-memory context returned below is enough to continue the lead-bound flow.
    }
  }

  return context;
}

export function loadCrmLeadProposalContext(): CrmLeadProposalContext | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawValue = window.sessionStorage.getItem(
      CRM_LEAD_PROPOSAL_CONTEXT_KEY,
    );

    if (!rawValue) {
      return null;
    }

    return normalizeCrmLeadProposalContext(JSON.parse(rawValue));
  } catch {
    return null;
  }
}

export function clearCrmLeadProposalContext() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(CRM_LEAD_PROPOSAL_CONTEXT_KEY);
}

function normalizeCrmLeadProposalContext(
  value: unknown,
): CrmLeadProposalContext | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<CrmLeadProposalContext>;

  if (!candidate.leadId || !candidate.leadName) {
    return null;
  }

  return {
    intent:
      candidate.intent === "simulation" || candidate.intent === "multi_cotas"
        ? candidate.intent
        : "proposal",
    leadId: candidate.leadId,
    leadName: candidate.leadName,
    leadDesiredCredit:
      typeof candidate.leadDesiredCredit === "number" &&
      Number.isFinite(candidate.leadDesiredCredit) &&
      candidate.leadDesiredCredit > 0
        ? candidate.leadDesiredCredit
        : undefined,
    responsibleName:
      typeof candidate.responsibleName === "string" &&
      candidate.responsibleName.trim()
        ? candidate.responsibleName.trim()
        : undefined,
    commercialContext: normalizeCommercialContext(candidate.commercialContext),
    createdAt: candidate.createdAt ?? new Date().toISOString(),
  };
}

function normalizeCommercialContext(
  value: unknown,
): CrmLeadProposalContext["commercialContext"] | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const candidate = value as CrmLeadProposalContext["commercialContext"];
  const context = {
    pipeline: normalizeOptionalText(candidate?.pipeline),
    stage: normalizeOptionalText(candidate?.stage),
    status: normalizeOptionalText(candidate?.status),
    temperature: normalizeOptionalText(candidate?.temperature),
  };

  return Object.values(context).some(Boolean) ? context : undefined;
}

function normalizeOptionalText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
