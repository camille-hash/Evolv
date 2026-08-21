import type {
  CreateCrmLeadCommercialProposalInput,
  CrmLeadCommercialProposal,
  ReviseCommercialProposalInput,
  ReviseCommercialProposalResult,
  RevokeCommercialProposalApprovalInput,
} from "@/modules/crm";

type ProposalsListPayload = {
  proposals?: CrmLeadCommercialProposal[];
};

type ProposalPayload = {
  error?: string;
  proposal?: CrmLeadCommercialProposal;
};

export const leadCommercialProposalsChangedEvent =
  "evolv:lead-commercial-proposals-changed";

export async function fetchLeadCommercialProposals(
  accessToken: string,
  leadId: string,
) {
  const response = await fetch(
    `/api/crm/lead-commercial-proposals?leadId=${encodeURIComponent(leadId)}`,
    {
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    },
  );
  const payload = (await response.json().catch(() => null)) as
    | ProposalsListPayload
    | null;

  if (!response.ok || !Array.isArray(payload?.proposals)) {
    throw new Error("Nao foi possivel carregar as propostas comerciais.");
  }

  return payload.proposals;
}

export async function createLeadCommercialProposal(
  accessToken: string,
  input: CreateCrmLeadCommercialProposalInput,
) {
  const response = await fetch("/api/crm/lead-commercial-proposals", {
    body: JSON.stringify(input),
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    method: "POST",
  });
  const payload = (await response.json().catch(() => null)) as
    | ProposalPayload
    | null;

  if (!response.ok || !payload?.proposal) {
    throw new Error(
      payload?.error ?? "Nao foi possivel salvar a proposta comercial.",
    );
  }

  notifyLeadCommercialProposalsChanged();
  return payload.proposal;
}

export async function updateLeadCommercialProposalStatus(
  accessToken: string,
  input: {
    action: "approve" | "expire" | "present" | "reject";
    proposalId: string;
  },
) {
  const response = await fetch("/api/crm/lead-commercial-proposals", {
    body: JSON.stringify(input),
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    method: "PATCH",
  });
  const payload = (await response.json().catch(() => null)) as
    | ProposalPayload
    | null;

  if (!response.ok || !payload?.proposal) {
    throw new Error(
      payload?.error ?? "Nao foi possivel atualizar a proposta comercial.",
    );
  }

  notifyLeadCommercialProposalsChanged();
  return payload.proposal;
}

export async function reviseLeadCommercialProposal(
  accessToken: string,
  input: ReviseCommercialProposalInput,
) {
  const response = await fetch("/api/crm/lead-commercial-proposals", {
    body: JSON.stringify({ action: "revise", ...input }),
    headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
    method: "PATCH",
  });
  const payload = (await response.json().catch(() => null)) as
    | (Partial<ReviseCommercialProposalResult> & { error?: string })
    | null;
  if (!response.ok || !payload?.proposal || !payload.previousProposal) {
    throw new Error(payload?.error ?? "Nao foi possivel revisar a proposta comercial.");
  }
  notifyLeadCommercialProposalsChanged();
  return payload as ReviseCommercialProposalResult;
}

export async function revokeLeadCommercialProposalApproval(
  accessToken: string,
  input: RevokeCommercialProposalApprovalInput,
) {
  const response = await fetch("/api/crm/lead-commercial-proposals", {
    body: JSON.stringify({ action: "revokeApproval", ...input }),
    headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
    method: "PATCH",
  });
  const payload = (await response.json().catch(() => null)) as ProposalPayload | null;
  if (!response.ok || !payload?.proposal) {
    throw new Error(payload?.error ?? "Nao foi possivel revogar a aprovacao.");
  }
  notifyLeadCommercialProposalsChanged();
  return payload.proposal;
}

function notifyLeadCommercialProposalsChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(leadCommercialProposalsChangedEvent));
  }
}
