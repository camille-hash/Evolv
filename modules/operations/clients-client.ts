import type { OperationsClientsResponse } from "./clients-types";

export async function fetchOperationsClients(accessToken: string) {
  const response = await fetch("/api/operations/clients", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const payload = (await response.json().catch(() => null)) as
    | ({ error?: string } & Partial<OperationsClientsResponse>)
    | null;

  if (!response.ok || !payload?.summary || !Array.isArray(payload.clients)) {
    throw new Error(
      payload?.error ?? "Nao foi possivel carregar os clientes operacionais.",
    );
  }

  return {
    clients: payload.clients,
    summary: payload.summary,
  };
}
