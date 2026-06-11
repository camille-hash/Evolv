const CRM_LEAD_PROPOSAL_CONTEXT_KEY = "evolv.crm.lead-proposal-context.v1";

export type CrmLeadProposalContext = {
  leadId: string;
  leadName: string;
  createdAt: string;
};

export function saveCrmLeadProposalContext(input: {
  leadId: string;
  leadName: string;
}): CrmLeadProposalContext {
  const context: CrmLeadProposalContext = {
    leadId: input.leadId,
    leadName: input.leadName,
    createdAt: new Date().toISOString(),
  };

  if (typeof window !== "undefined") {
    window.sessionStorage.setItem(
      CRM_LEAD_PROPOSAL_CONTEXT_KEY,
      JSON.stringify(context),
    );
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
    leadId: candidate.leadId,
    leadName: candidate.leadName,
    createdAt: candidate.createdAt ?? new Date().toISOString(),
  };
}
