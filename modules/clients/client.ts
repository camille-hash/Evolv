import type {
  ClientDetailResponse,
  ClientListFilters,
  ClientListItem,
} from "./types";

export async function fetchClients(
  accessToken: string,
  filters: ClientListFilters = {},
) {
  const response = await fetch(`/api/clients?${createClientQuery(filters)}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const payload = (await response.json().catch(() => null)) as {
    clients?: ClientListItem[];
    error?: string;
  } | null;

  if (!response.ok || !Array.isArray(payload?.clients)) {
    throw new Error(payload?.error ?? "Nao foi possivel carregar os clientes.");
  }

  return payload.clients;
}

export async function fetchClientById(accessToken: string, clientId: string) {
  const response = await fetch(`/api/clients/${encodeURIComponent(clientId)}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const payload = (await response.json().catch(() => null)) as
    | (Partial<ClientDetailResponse> & { error?: string })
    | null;

  if (!response.ok || !payload?.client || !Array.isArray(payload.contracts)) {
    throw new Error(payload?.error ?? "Nao foi possivel carregar o cliente.");
  }

  return payload as ClientDetailResponse;
}

function createClientQuery(filters: ClientListFilters) {
  const params = new URLSearchParams();

  if (filters.status) {
    params.set("status", filters.status);
  }

  if (filters.search) {
    params.set("search", filters.search);
  }

  if (filters.limit) {
    params.set("limit", String(filters.limit));
  }

  if (filters.offset) {
    params.set("offset", String(filters.offset));
  }

  return params.toString();
}
