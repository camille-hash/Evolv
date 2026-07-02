import type { OperationsSummary } from "./types";

export async function fetchOperationsSummary(accessToken: string) {
  const response = await fetch("/api/operations/summary", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
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
