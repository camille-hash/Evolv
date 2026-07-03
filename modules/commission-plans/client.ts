import { requireSupabaseAccessToken } from "@/modules/access/supabase-session-token";
import type {
  CommissionPlan,
  CommissionPlanCreateInput,
  CommissionPlanListFilters,
  CommissionPlanUpdateInput,
} from "./types";

export async function fetchCommissionPlans(
  accessToken: string | null | undefined,
  filters: CommissionPlanListFilters = {},
) {
  const resolvedAccessToken = await requireCommissionPlansAccessToken(accessToken);
  const response = await fetch(
    `/api/commission-plans?${createCommissionPlanQuery(filters)}`,
    {
      headers: {
        Authorization: `Bearer ${resolvedAccessToken}`,
      },
    },
  );

  const payload = (await response.json().catch(() => null)) as {
    commissionPlans?: CommissionPlan[];
    error?: string;
  } | null;

  if (!response.ok || !Array.isArray(payload?.commissionPlans)) {
    throw new Error(
      payload?.error ?? "Nao foi possivel carregar os planos de comissao.",
    );
  }

  return payload.commissionPlans;
}

export async function fetchCommissionPlan(
  accessToken: string | null | undefined,
  commissionPlanId: string,
) {
  const resolvedAccessToken = await requireCommissionPlansAccessToken(accessToken);
  const response = await fetch(
    `/api/commission-plans/${encodeURIComponent(commissionPlanId)}`,
    {
      headers: {
        Authorization: `Bearer ${resolvedAccessToken}`,
      },
    },
  );

  const payload = (await response.json().catch(() => null)) as {
    commissionPlan?: CommissionPlan;
    error?: string;
  } | null;

  if (!response.ok || !payload?.commissionPlan) {
    throw new Error(
      payload?.error ?? "Nao foi possivel carregar o plano de comissao.",
    );
  }

  return payload.commissionPlan;
}

export async function createCommissionPlan(
  accessToken: string | null | undefined,
  input: CommissionPlanCreateInput,
) {
  const resolvedAccessToken = await requireCommissionPlansAccessToken(accessToken);
  const response = await fetch("/api/commission-plans", {
    body: JSON.stringify(input),
    headers: {
      Authorization: `Bearer ${resolvedAccessToken}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  const payload = (await response.json().catch(() => null)) as {
    commissionPlan?: CommissionPlan;
    error?: string;
  } | null;

  if (!response.ok || !payload?.commissionPlan) {
    throw new Error(
      payload?.error ?? "Nao foi possivel criar o plano de comissao.",
    );
  }

  return payload.commissionPlan;
}

export async function updateCommissionPlan(
  accessToken: string | null | undefined,
  commissionPlanId: string,
  input: CommissionPlanUpdateInput,
) {
  const resolvedAccessToken = await requireCommissionPlansAccessToken(accessToken);
  const response = await fetch(
    `/api/commission-plans/${encodeURIComponent(commissionPlanId)}`,
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
    commissionPlan?: CommissionPlan;
    error?: string;
  } | null;

  if (!response.ok || !payload?.commissionPlan) {
    throw new Error(
      payload?.error ?? "Nao foi possivel atualizar o plano de comissao.",
    );
  }

  return payload.commissionPlan;
}

function requireCommissionPlansAccessToken(
  accessToken: string | null | undefined,
) {
  return accessToken
    ? Promise.resolve(accessToken)
    : requireSupabaseAccessToken(
        "Sessao invalida para acessar planos de comissao.",
      );
}

function createCommissionPlanQuery(filters: CommissionPlanListFilters) {
  const params = new URLSearchParams();

  if (filters.administratorId) {
    params.set("administratorId", filters.administratorId);
  }

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
