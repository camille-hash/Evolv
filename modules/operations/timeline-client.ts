import type { OperationsTimelineResponse } from "./timeline-types";

export async function fetchOperationsTimeline(accessToken: string) {
  const response = await fetch("/api/operations/timeline", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
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
