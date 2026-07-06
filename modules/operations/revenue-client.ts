import { requireSupabaseAccessToken } from "@/modules/access/supabase-session-token";
import type {
  OperationsRevenueQuery,
  OperationsRevenueResponse,
} from "./revenue-types";

export async function fetchOperationsRevenue(
  query?: OperationsRevenueQuery,
  accessToken?: string | null,
) {
  const resolvedAccessToken =
    accessToken ??
    (await requireSupabaseAccessToken(
      "Sessao invalida para carregar as receitas operacionais.",
    ));
  const response = await fetch(buildOperationsRevenueUrl(query), {
    headers: {
      Authorization: `Bearer ${resolvedAccessToken}`,
    },
  });

  const payload = (await response.json().catch(() => null)) as
    | ({ error?: string } & Partial<OperationsRevenueResponse>)
    | null;

  if (
    !response.ok ||
    !payload?.dailyPanel ||
    !payload?.summary ||
    !payload.filters ||
    !payload.pagination ||
    !Array.isArray(payload.entries)
  ) {
    throw new Error(
      payload?.error ?? "Nao foi possivel carregar as receitas operacionais.",
    );
  }

  return {
    dailyPanel: payload.dailyPanel,
    entries: payload.entries,
    filters: payload.filters,
    pagination: payload.pagination,
    summary: payload.summary,
  };
}

export async function recognizeOperationsExpectedRevenue(
  entryId: string,
  input: {
    notes?: string | null;
    recognizedAmount: number;
    recognizedAt: string;
  },
  accessToken?: string | null,
) {
  const resolvedAccessToken =
    accessToken ??
    (await requireSupabaseAccessToken(
      "Sessao invalida para reconhecer receitas operacionais.",
    ));
  const response = await fetch(
    `/api/expected-revenue/${encodeURIComponent(entryId)}/recognize`,
    {
      body: JSON.stringify(input),
      headers: {
        Authorization: `Bearer ${resolvedAccessToken}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    },
  );

  const payload = (await response.json().catch(() => null)) as
    | {
        error?: string;
        expectedRevenueEntry?: unknown;
        recognizedRevenueEntry?: unknown;
      }
    | null;

  if (
    !response.ok ||
    !payload?.expectedRevenueEntry ||
    !payload.recognizedRevenueEntry
  ) {
    throw new Error(
      payload?.error ?? "Nao foi possivel reconhecer a receita prevista.",
    );
  }

  return payload;
}

function buildOperationsRevenueUrl(query?: OperationsRevenueQuery) {
  const searchParams = new URLSearchParams();

  if (query?.search) {
    searchParams.set("search", query.search);
  }

  if (query?.status) {
    searchParams.set("status", query.status);
  }

  if (query?.administratorId) {
    searchParams.set("administratorId", query.administratorId);
  }

  if (query?.clientId) {
    searchParams.set("clientId", query.clientId);
  }

  if (query?.contract) {
    searchParams.set("contract", query.contract);
  }

  if (query?.contractId) {
    searchParams.set("contractId", query.contractId);
  }

  if (query?.entryId) {
    searchParams.set("entryId", query.entryId);
  }

  if (query?.competency) {
    searchParams.set("competency", query.competency);
  }

  if (query?.dueFrom) {
    searchParams.set("dueFrom", query.dueFrom);
  }

  if (query?.dueTo) {
    searchParams.set("dueTo", query.dueTo);
  }

  if (query?.minAmount !== undefined && query.minAmount !== null) {
    searchParams.set("minAmount", String(query.minAmount));
  }

  if (query?.maxAmount !== undefined && query.maxAmount !== null) {
    searchParams.set("maxAmount", String(query.maxAmount));
  }

  if (query?.page) {
    searchParams.set("page", String(query.page));
  }

  if (query?.pageSize) {
    searchParams.set("pageSize", String(query.pageSize));
  }

  if (query?.sort) {
    searchParams.set("sort", query.sort);
  }

  if (query?.order) {
    searchParams.set("order", query.order);
  }

  const serialized = searchParams.toString();

  return serialized
    ? `/api/operations/revenue?${serialized}`
    : "/api/operations/revenue";
}
