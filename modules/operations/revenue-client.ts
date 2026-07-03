import { requireSupabaseAccessToken } from "@/modules/access/supabase-session-token";
import type { OperationsRevenueResponse } from "./revenue-types";

export async function fetchOperationsRevenue(accessToken?: string | null) {
  const resolvedAccessToken =
    accessToken ??
    (await requireSupabaseAccessToken(
      "Sessao invalida para carregar as receitas operacionais.",
    ));
  const response = await fetch("/api/operations/revenue", {
    headers: {
      Authorization: `Bearer ${resolvedAccessToken}`,
    },
  });

  const payload = (await response.json().catch(() => null)) as
    | ({ error?: string } & Partial<OperationsRevenueResponse>)
    | null;

  if (!response.ok || !payload?.summary || !Array.isArray(payload.entries)) {
    throw new Error(
      payload?.error ?? "Nao foi possivel carregar as receitas operacionais.",
    );
  }

  return {
    entries: payload.entries,
    summary: payload.summary,
  };
}
