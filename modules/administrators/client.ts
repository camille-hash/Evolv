import { requireSupabaseAccessToken } from "@/modules/access/supabase-session-token";
import type {
  Administrator,
  AdministratorCreateInput,
  AdministratorListFilters,
  AdministratorUpdateInput,
} from "./types";

export async function fetchAdministrators(
  accessToken: string | null | undefined,
  filters: AdministratorListFilters = {},
) {
  const resolvedAccessToken = await requireAdministratorsAccessToken(accessToken);
  const response = await fetch(
    `/api/administrators?${createAdministratorQuery(filters)}`,
    {
      headers: {
        Authorization: `Bearer ${resolvedAccessToken}`,
      },
    },
  );

  const payload = (await response.json().catch(() => null)) as {
    administrators?: Administrator[];
    error?: string;
  } | null;

  if (!response.ok || !Array.isArray(payload?.administrators)) {
    throw new Error(
      payload?.error ?? "Nao foi possivel carregar as administradoras.",
    );
  }

  return payload.administrators;
}

export async function fetchAdministrator(
  accessToken: string | null | undefined,
  administratorId: string,
) {
  const resolvedAccessToken = await requireAdministratorsAccessToken(accessToken);
  const response = await fetch(
    `/api/administrators/${encodeURIComponent(administratorId)}`,
    {
      headers: {
        Authorization: `Bearer ${resolvedAccessToken}`,
      },
    },
  );

  const payload = (await response.json().catch(() => null)) as {
    administrator?: Administrator;
    error?: string;
  } | null;

  if (!response.ok || !payload?.administrator) {
    throw new Error(
      payload?.error ?? "Nao foi possivel carregar a administradora.",
    );
  }

  return payload.administrator;
}

export async function createAdministrator(
  accessToken: string | null | undefined,
  input: AdministratorCreateInput,
) {
  const resolvedAccessToken = await requireAdministratorsAccessToken(accessToken);
  const response = await fetch("/api/administrators", {
    body: JSON.stringify(input),
    headers: {
      Authorization: `Bearer ${resolvedAccessToken}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  const payload = (await response.json().catch(() => null)) as {
    administrator?: Administrator;
    error?: string;
  } | null;

  if (!response.ok || !payload?.administrator) {
    throw new Error(
      payload?.error ?? "Nao foi possivel criar a administradora.",
    );
  }

  return payload.administrator;
}

export async function updateAdministrator(
  accessToken: string | null | undefined,
  administratorId: string,
  input: AdministratorUpdateInput,
) {
  const resolvedAccessToken = await requireAdministratorsAccessToken(accessToken);
  const response = await fetch(
    `/api/administrators/${encodeURIComponent(administratorId)}`,
    {
      body: JSON.stringify(input),
      headers: {
        Authorization: `Bearer ${resolvedAccessToken}`,
        "Content-Type": "application/json",
      },
      method: "PATCH",
    },
  );

  const payload = (await response.json().catch(() => null)) as {
    administrator?: Administrator;
    error?: string;
  } | null;

  if (!response.ok || !payload?.administrator) {
    throw new Error(
      payload?.error ?? "Nao foi possivel atualizar a administradora.",
    );
  }

  return payload.administrator;
}

function requireAdministratorsAccessToken(
  accessToken: string | null | undefined,
) {
  return accessToken
    ? Promise.resolve(accessToken)
    : requireSupabaseAccessToken(
        "Sessao invalida para acessar administradoras.",
      );
}

function createAdministratorQuery(filters: AdministratorListFilters) {
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
