import type {
  RevenueEntry,
  RevenueGenerationMode,
  RevenueGenerationResult,
} from "./types";

export async function generateContractRevenue(
  accessToken: string,
  contractId: string,
  mode: RevenueGenerationMode = "create_missing",
) {
  const response = await fetch(
    `/api/contracts/${encodeURIComponent(contractId)}/generate-revenue`,
    {
      body: JSON.stringify({ mode }),
      headers: {
        Authorization: `Bearer ${accessToken}`,
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
  accessToken: string,
  contractId: string,
) {
  const response = await fetch(
    `/api/contracts/${encodeURIComponent(contractId)}/revenue`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
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

export async function fetchClientRevenue(accessToken: string, clientId: string) {
  const response = await fetch(
    `/api/clients/${encodeURIComponent(clientId)}/revenue`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
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
