import type { Contract, ContractInput, LeadContractSummary } from "./types";

export async function createContract(
  accessToken: string,
  input: ContractInput,
) {
  const response = await fetch("/api/contracts", {
    body: JSON.stringify(input),
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  const payload = (await response.json().catch(() => null)) as {
    contract?: Contract;
    error?: string;
  } | null;

  if (!response.ok || !payload?.contract) {
    throw new Error(payload?.error ?? "Nao foi possivel criar o contrato.");
  }

  return payload.contract;
}

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
