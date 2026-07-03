import { requireSupabaseAccessToken } from "@/modules/access/supabase-session-token";
import type { OperationsPortfolioResponse } from "./portfolio-types";

export async function fetchOperationsPortfolio(accessToken?: string | null) {
  const resolvedAccessToken =
    accessToken ??
    (await requireSupabaseAccessToken(
      "Sessao invalida para carregar a carteira operacional.",
    ));
  const response = await fetch("/api/operations/portfolio", {
    headers: {
      Authorization: `Bearer ${resolvedAccessToken}`,
    },
  });

  const payload = (await response.json().catch(() => null)) as
    | ({ error?: string } & Partial<OperationsPortfolioResponse>)
    | null;

  if (
    !response.ok ||
    !payload?.summary ||
    !Array.isArray(payload.clientExposures) ||
    !Array.isArray(payload.administratorExposures) ||
    !Array.isArray(payload.contracts)
  ) {
    throw new Error(
      payload?.error ?? "Nao foi possivel carregar a carteira operacional.",
    );
  }

  return {
    administratorExposures: payload.administratorExposures,
    clientExposures: payload.clientExposures,
    contracts: payload.contracts,
    summary: payload.summary,
  };
}
