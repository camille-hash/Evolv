import { requireSupabaseAccessToken } from "@/modules/access/supabase-session-token";
import type { OperationsSummary } from "./types";

export async function fetchOperationsSummary(accessToken?: string | null) {
  const resolvedAccessToken = await requireOperationsAccessToken(accessToken);
  const response = await fetch("/api/operations/summary", {
    headers: {
      Authorization: `Bearer ${resolvedAccessToken}`,
    },
  });

  const payload = (await response.json().catch(() => null)) as {
    error?: string;
    summary?: OperationsSummary;
  } | null;

  if (!response.ok || !payload?.summary) {
    throw new Error(
      payload?.error ?? "Nao foi possivel carregar a operacao.",
    );
  }

  return payload.summary;
}

function requireOperationsAccessToken(accessToken: string | null | undefined) {
  return accessToken
    ? Promise.resolve(accessToken)
    : requireSupabaseAccessToken(
        "Sessao invalida para carregar a operacao.",
      );
}
