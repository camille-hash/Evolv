import type { LeadContractSummary } from "./types";

export async function fetchLeadContracts(
  accessToken: string,
  leadId: string,
) {
  const response = await fetch(
    `/api/crm/leads/${encodeURIComponent(leadId)}/contracts`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  const payload = (await response.json().catch(() => null)) as {
    contracts?: LeadContractSummary[];
    error?: string;
  } | null;

  if (!response.ok || !Array.isArray(payload?.contracts)) {
    throw new Error(payload?.error ?? "Nao foi possivel carregar os contratos.");
  }

  return payload.contracts;
}
