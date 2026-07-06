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

export async function recognizeOperationsExpectedRevenue(
  entryId: string,
  input: {
    notes?: string | null;
    recognizedAmount: number;
    recognizedAt: string;
  },
  accessToken?: string | null,
) {
  const resolvedAccessToken =
    accessToken ??
    (await requireSupabaseAccessToken(
      "Sessao invalida para reconhecer receitas operacionais.",
    ));
  const response = await fetch(
    `/api/expected-revenue/${encodeURIComponent(entryId)}/recognize`,
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
        error?: string;
        expectedRevenueEntry?: unknown;
        recognizedRevenueEntry?: unknown;
      }
    | null;

  if (
    !response.ok ||
    !payload?.expectedRevenueEntry ||
    !payload.recognizedRevenueEntry
  ) {
    throw new Error(
      payload?.error ?? "Nao foi possivel reconhecer a receita prevista.",
    );
  }

  return payload;
}
