import { requireSupabaseAccessToken } from "@/modules/access/supabase-session-token";
import type { OperationsAdministratorsResponse } from "./administrators-types";

export async function fetchOperationsAdministrators(accessToken?: string | null) {
  const resolvedAccessToken =
    accessToken ??
    (await requireSupabaseAccessToken(
      "Sessao invalida para carregar as administradoras operacionais.",
    ));
  const response = await fetch("/api/operations/administrators", {
    headers: {
      Authorization: `Bearer ${resolvedAccessToken}`,
    },
  });

  const payload = (await response.json().catch(() => null)) as
    | ({ error?: string } & Partial<OperationsAdministratorsResponse>)
    | null;

  if (
    !response.ok ||
    !payload?.summary ||
    !Array.isArray(payload.administrators)
  ) {
    throw new Error(
      payload?.error ??
        "Nao foi possivel carregar as administradoras operacionais.",
    );
  }

  return {
    administrators: payload.administrators,
    summary: payload.summary,
  };
}
