import { requireSupabaseAccessToken } from "@/modules/access/supabase-session-token";
import type { OperationsSearchResponse } from "./search-types";

export async function searchOperations(
  query: string,
  accessToken?: string | null,
) {
  const resolvedQuery = query.trim();

  if (!resolvedQuery) {
    return {
      groups: [],
      query: "",
      totalResults: 0,
    } satisfies OperationsSearchResponse;
  }

  const resolvedAccessToken =
    accessToken ??
    (await requireSupabaseAccessToken(
      "Sessao invalida para pesquisar na operacao.",
    ));

  const response = await fetch(
    `/api/operations/search?q=${encodeURIComponent(resolvedQuery)}`,
    {
      headers: {
        Authorization: `Bearer ${resolvedAccessToken}`,
      },
    },
  );

  const payload = (await response.json().catch(() => null)) as
    | ({ error?: string } & Partial<OperationsSearchResponse>)
    | null;

  if (
    !response.ok ||
    !payload ||
    typeof payload.query !== "string" ||
    typeof payload.totalResults !== "number" ||
    !Array.isArray(payload.groups)
  ) {
    throw new Error(
      payload?.error ?? "Nao foi possivel pesquisar na operacao.",
    );
  }

  return {
    groups: payload.groups,
    query: payload.query,
    totalResults: payload.totalResults,
  } satisfies OperationsSearchResponse;
}
