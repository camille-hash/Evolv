import { requireSupabaseAccessToken } from "@/modules/access/supabase-session-token";
import type { OperationsContractsResponse } from "./contracts-types";

export async function fetchOperationsContracts(accessToken?: string | null) {
  const resolvedAccessToken =
    accessToken ??
    (await requireSupabaseAccessToken(
      "Sessao invalida para carregar os contratos operacionais.",
    ));
  const response = await fetch("/api/operations/contracts", {
    headers: {
      Authorization: `Bearer ${resolvedAccessToken}`,
    },
  });

  const payload = (await response.json().catch(() => null)) as
    | ({ error?: string } & Partial<OperationsContractsResponse>)
    | null;

  if (!response.ok || !payload?.summary || !Array.isArray(payload.contracts)) {
    throw new Error(
      payload?.error ?? "Nao foi possivel carregar os contratos operacionais.",
    );
  }

  return {
    contracts: payload.contracts,
    summary: payload.summary,
  };
}
