import { requireSupabaseAccessToken } from "@/modules/access/supabase-session-token";
import type {
  ExpectedRevenueInput,
  RevenueEntry,
  RevenueGenerationMode,
  RevenueGenerationResult,
} from "./types";

export async function generateContractRevenue(
  accessToken: string | null | undefined,
  contractId: string,
  mode: RevenueGenerationMode = "create_missing",
) {
  const resolvedAccessToken = await requireRevenueAccessToken(accessToken);
  const response = await fetch(
    `/api/contracts/${encodeURIComponent(contractId)}/generate-revenue`,
    {
      body: JSON.stringify({ mode }),
      headers: {
        Authorization: `Bearer ${resolvedAccessToken}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    },
  );

  const payload = (await response.json().catch(() => null)) as
    | ({ error?: string } & Partial<RevenueGenerationResult>)
    | null;

  if (!response.ok || !payload) {
    throw new Error(payload?.error ?? "Nao foi possivel gerar receitas.");
  }

  return {
    createdEntries: payload.createdEntries ?? [],
    existingEntries: payload.existingEntries ?? [],
    skippedReason: payload.skippedReason ?? null,
  };
}

export async function fetchContractRevenue(
  accessToken: string | null | undefined,
  contractId: string,
) {
  const resolvedAccessToken = await requireRevenueAccessToken(accessToken);
  const response = await fetch(
    `/api/contracts/${encodeURIComponent(contractId)}/revenue`,
    {
      headers: {
        Authorization: `Bearer ${resolvedAccessToken}`,
      },
    },
  );

  const payload = (await response.json().catch(() => null)) as {
    error?: string;
    revenueEntries?: RevenueEntry[];
  } | null;

  if (!response.ok || !Array.isArray(payload?.revenueEntries)) {
    throw new Error(payload?.error ?? "Nao foi possivel carregar receitas.");
  }

  return payload.revenueEntries;
}

export async function fetchClientRevenue(
  accessToken: string | null | undefined,
  clientId: string,
) {
  const resolvedAccessToken = await requireRevenueAccessToken(accessToken);
  const response = await fetch(
    `/api/clients/${encodeURIComponent(clientId)}/revenue`,
    {
      headers: {
        Authorization: `Bearer ${resolvedAccessToken}`,
      },
    },
  );

  const payload = (await response.json().catch(() => null)) as {
    error?: string;
    revenueEntries?: RevenueEntry[];
  } | null;

  if (!response.ok || !Array.isArray(payload?.revenueEntries)) {
    throw new Error(payload?.error ?? "Nao foi possivel carregar receitas.");
  }

  return payload.revenueEntries;
}

export async function createExpectedContractRevenue(
  accessToken: string | null | undefined,
  contractId: string,
  input: ExpectedRevenueInput,
) {
  const resolvedAccessToken = await requireRevenueAccessToken(accessToken);
  const response = await fetch(
    `/api/contracts/${encodeURIComponent(contractId)}/expected-revenue`,
    {
      body: JSON.stringify(input),
      headers: {
        Authorization: `Bearer ${resolvedAccessToken}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    },
  );

  const payload = (await response.json().catch(() => null)) as {
    error?: string;
    revenueEntry?: RevenueEntry;
  } | null;

  if (!response.ok || !payload?.revenueEntry) {
    throw new Error(
      payload?.error ?? "Nao foi possivel criar a receita esperada.",
    );
  }

  return payload.revenueEntry;
}

function requireRevenueAccessToken(accessToken: string | null | undefined) {
  return accessToken
    ? Promise.resolve(accessToken)
    : requireSupabaseAccessToken("Sessao invalida para acessar receitas.");
}
