import type {
  PortfolioByAdministrator,
  PortfolioClient,
  PortfolioClientFilters,
  PortfolioSummaryResponse,
} from "./types";

export async function fetchPortfolioSummary(accessToken: string) {
  const response = await fetch("/api/portfolio/summary", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const payload = (await response.json().catch(() => null)) as
    | ({ error?: string } & Partial<PortfolioSummaryResponse>)
    | null;

  if (
    !response.ok ||
    !payload?.summary ||
    !Array.isArray(payload.byAdministrator) ||
    !Array.isArray(payload.byStatus) ||
    !Array.isArray(payload.topClients)
  ) {
    throw new Error(
      payload?.error ?? "Nao foi possivel carregar o portfolio.",
    );
  }

  return {
    byAdministrator: payload.byAdministrator,
    byStatus: payload.byStatus,
    summary: payload.summary,
    topClients: payload.topClients,
  };
}

export async function fetchPortfolioClients(
  accessToken: string,
  filters: PortfolioClientFilters = {},
) {
  const params = new URLSearchParams();

  setParam(params, "search", filters.search);
  setParam(params, "status", filters.status);
  setParam(params, "limit", filters.limit);
  setParam(params, "offset", filters.offset);

  const response = await fetch(`/api/portfolio/clients?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const payload = (await response.json().catch(() => null)) as {
    clients?: PortfolioClient[];
    error?: string;
  } | null;

  if (!response.ok || !Array.isArray(payload?.clients)) {
    throw new Error(
      payload?.error ?? "Nao foi possivel carregar clientes do portfolio.",
    );
  }

  return payload.clients;
}

export async function fetchPortfolioAdministrators(accessToken: string) {
  const response = await fetch("/api/portfolio/administrators", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const payload = (await response.json().catch(() => null)) as {
    administrators?: PortfolioByAdministrator[];
    error?: string;
  } | null;

  if (!response.ok || !Array.isArray(payload?.administrators)) {
    throw new Error(
      payload?.error ??
        "Nao foi possivel carregar administradoras do portfolio.",
    );
  }

  return payload.administrators;
}

function setParam(
  params: URLSearchParams,
  key: string,
  value: number | string | null | undefined,
) {
  if (value !== null && value !== undefined && value !== "") {
    params.set(key, String(value));
  }
}
