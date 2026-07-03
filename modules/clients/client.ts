import type {
  ClientDetailResponse,
  ClientListFilters,
  ClientListItem,
  LeadClientConversion,
} from "./types";
import { requireSupabaseAccessToken } from "@/modules/access/supabase-session-token";

export async function fetchClients(
  accessToken?: string | null,
  filters: ClientListFilters = {},
) {
  const resolvedAccessToken = await requireClientAccessToken(accessToken);
  const response = await fetch(`/api/clients?${createClientQuery(filters)}`, {
    headers: {
      Authorization: `Bearer ${resolvedAccessToken}`,
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

export async function fetchClientById(
  accessToken: string | null | undefined,
  clientId: string,
) {
  const resolvedAccessToken = await requireClientAccessToken(accessToken);
  const response = await fetch(`/api/clients/${encodeURIComponent(clientId)}`, {
    headers: {
      Authorization: `Bearer ${resolvedAccessToken}`,
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

export async function convertLeadToPersistedClient(
  accessToken: string | null | undefined,
  leadId: string,
) {
  const resolvedAccessToken = await requireClientAccessToken(accessToken);
  const response = await fetch(
    `/api/crm/leads/${encodeURIComponent(leadId)}/convert-to-client`,
    {
      headers: {
        Authorization: `Bearer ${resolvedAccessToken}`,
      },
      method: "POST",
    },
  );

  const payload = (await response.json().catch(() => null)) as
    | ({ error?: string } & Partial<LeadClientConversion>)
    | null;

  if (!response.ok || !payload?.client || !payload.lead) {
    throw new Error(payload?.error ?? "Nao foi possivel converter o lead.");
  }

  return payload as LeadClientConversion;
}

function requireClientAccessToken(accessToken: string | null | undefined) {
  return accessToken
    ? Promise.resolve(accessToken)
    : requireSupabaseAccessToken(
        "Sessao invalida para acessar clientes persistidos.",
      );
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
