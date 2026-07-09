import { requireSupabaseAccessToken } from "@/modules/access/supabase-session-token";
import type {
  Contract,
  ContractInput,
  ContractStatusInput,
  LeadContractSummary,
} from "./types";

export async function createContract(
  accessToken: string | null | undefined,
  input: ContractInput,
) {
  const resolvedAccessToken = await requireContractsAccessToken(accessToken);
  const response = await fetch("/api/contracts", {
    body: JSON.stringify(input),
    headers: {
      Authorization: `Bearer ${resolvedAccessToken}`,
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

export async function updateContract(
  accessToken: string | null | undefined,
  contractId: string,
  input: ContractInput,
) {
  const resolvedAccessToken = await requireContractsAccessToken(accessToken);
  const response = await fetch(`/api/contracts/${encodeURIComponent(contractId)}`, {
    body: JSON.stringify(input),
    headers: {
      Authorization: `Bearer ${resolvedAccessToken}`,
      "Content-Type": "application/json",
    },
    method: "PATCH",
  });

  const payload = (await response.json().catch(() => null)) as {
    contract?: Contract;
    error?: string;
  } | null;

  if (!response.ok || !payload?.contract) {
    throw new Error(payload?.error ?? "Nao foi possivel atualizar o contrato.");
  }

  return payload.contract;
}

export async function fetchLeadContracts(
  accessToken: string | null | undefined,
  leadId: string,
) {
  const resolvedAccessToken = await requireContractsAccessToken(accessToken);
  const response = await fetch(
    `/api/crm/leads/${encodeURIComponent(leadId)}/contracts`,
    {
      headers: {
        Authorization: `Bearer ${resolvedAccessToken}`,
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

export type UpdateContractStatusResult = {
  contract: Contract;
  warning: string | null;
};

export async function updateContractStatus(
  accessToken: string | null | undefined,
  contractId: string,
  input: ContractStatusInput,
) {
  const resolvedAccessToken = await requireContractsAccessToken(accessToken);
  const response = await fetch(
    `/api/contracts/${encodeURIComponent(contractId)}/status`,
    {
      body: JSON.stringify(input),
      headers: {
        Authorization: `Bearer ${resolvedAccessToken}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    },
  );

  const payload = (await response.json().catch(() => null)) as
    | {
        contract?: Contract;
        error?: string;
        warning?: string | null;
      }
    | null;

  if (!response.ok || !payload?.contract) {
    throw new Error(
      payload?.error ?? "Nao foi possivel alterar a situacao do contrato.",
    );
  }

  return {
    contract: payload.contract,
    warning: payload.warning ?? null,
  } satisfies UpdateContractStatusResult;
}

function requireContractsAccessToken(accessToken: string | null | undefined) {
  return accessToken
    ? Promise.resolve(accessToken)
    : requireSupabaseAccessToken(
        "Sessao invalida para acessar contratos.",
      );
}
