import type {
  Administrator,
  AdministratorCreateInput,
  AdministratorListFilters,
  AdministratorUpdateInput,
} from "./types";

export async function fetchAdministrators(
  accessToken: string,
  filters: AdministratorListFilters = {},
) {
  const response = await fetch(
    `/api/administrators?${createAdministratorQuery(filters)}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
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
  accessToken: string,
  administratorId: string,
) {
  const response = await fetch(
    `/api/administrators/${encodeURIComponent(administratorId)}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
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
  accessToken: string,
  input: AdministratorCreateInput,
) {
  const response = await fetch("/api/administrators", {
    body: JSON.stringify(input),
    headers: {
      Authorization: `Bearer ${accessToken}`,
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
  accessToken: string,
  administratorId: string,
  input: AdministratorUpdateInput,
) {
  const response = await fetch(
    `/api/administrators/${encodeURIComponent(administratorId)}`,
    {
      body: JSON.stringify(input),
      headers: {
        Authorization: `Bearer ${accessToken}`,
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
