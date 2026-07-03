import { requireSupabaseAccessToken } from "@/modules/access/supabase-session-token";
import type { OperationsTimelineResponse } from "./timeline-types";

export async function fetchOperationsTimeline(accessToken?: string | null) {
  const resolvedAccessToken =
    accessToken ??
    (await requireSupabaseAccessToken(
      "Sessao invalida para carregar a timeline operacional.",
    ));
  const response = await fetch("/api/operations/timeline", {
    headers: {
      Authorization: `Bearer ${resolvedAccessToken}`,
    },
  });

  const payload = (await response.json().catch(() => null)) as
    | ({ error?: string } & Partial<OperationsTimelineResponse>)
    | null;

  if (!response.ok || !Array.isArray(payload?.items)) {
    throw new Error(
      payload?.error ?? "Nao foi possivel carregar a timeline operacional.",
    );
  }

  return {
    items: payload.items,
  };
}
