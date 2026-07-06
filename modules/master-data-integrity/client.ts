"use client";

import { requireSupabaseAccessToken } from "@/modules/access/supabase-session-token";
import type { MasterDataIntegrityContractsResponse } from "./types";

export async function fetchMasterDataIntegrityContracts(
  accessToken?: string | null,
) {
  const resolvedAccessToken =
    accessToken ??
    (await requireSupabaseAccessToken(
      "Sessao invalida para carregar a integridade operacional.",
    ));
  const response = await fetch("/api/master-data-integrity/contracts", {
    headers: {
      Authorization: `Bearer ${resolvedAccessToken}`,
    },
  });

  const payload = (await response.json().catch(() => null)) as
    | ({ error?: string } & Partial<MasterDataIntegrityContractsResponse>)
    | null;

  if (!response.ok || !payload?.summary || !Array.isArray(payload.contracts)) {
    throw new Error(
      payload?.error ??
        "Nao foi possivel carregar o diagnostico de integridade operacional.",
    );
  }

  return {
    contracts: payload.contracts,
    issues: Array.isArray(payload.issues) ? payload.issues : [],
    summary: payload.summary,
  };
}
