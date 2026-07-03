import { createClient, type User as SupabaseUser } from "@supabase/supabase-js";
import type {
  OperationsRevenueResponse,
  OperationsRevenueRow,
  OperationsRevenueStatus,
} from "./revenue-types";

type OperationsRevenueProfile = {
  id: string;
  is_active: boolean | null;
  organization_id: string | null;
  role: string | null;
};

type RevenueEntryRow = {
  actual_amount: number | string | null;
  administrator_id: string | null;
  client_id: string | null;
  contract_id: string | null;
  due_date: string | null;
  expected_amount: number | string | null;
  id: string;
  organization_id: string | null;
  paid_at: string | null;
  status: string | null;
};

type ContractRow = {
  administrator_id: string | null;
  client_id: string | null;
  contract_number: string | null;
  id: string;
  organization_id: string | null;
};

type ClientRow = {
  id: string;
  name: string | null;
  organization_id: string | null;
};

type AdministratorRow = {
  id: string;
  name: string | null;
  organization_id: string | null;
};

type RequestContext = {
  profile: OperationsRevenueProfile & {
    is_active: true;
    organization_id: string;
    role: "admin" | "master" | "sdr";
  };
  supabase: ReturnType<typeof createServerOperationsRevenueSupabaseClient>;
  user: SupabaseUser;
};

export type OperationsRevenueResult =
  | ({ ok: true } & OperationsRevenueResponse)
  | { error: string; ok: false; status: number };

const genericAccessError =
  "Nao foi possivel concluir a operacao. Entre em contato com o administrador.";

export async function listOperationsRevenue(
  accessToken: string | null,
): Promise<OperationsRevenueResult> {
  const context = await resolveOperationsRevenueRequestContext(accessToken);

  if (!context.ok) {
    return context;
  }

  const dataset = await loadOperationsRevenueDataset(context);

  if (!dataset.ok) {
    return dataset;
  }

  const entries = buildOperationsRevenueRows(dataset).sort((left, right) => {
    const leftDate = left.paidAt ?? left.dueDate ?? "";
    const rightDate = right.paidAt ?? right.dueDate ?? "";

    return new Date(rightDate).getTime() - new Date(leftDate).getTime();
  });

  return {
    entries,
    ok: true,
    summary: summarizeRevenue(entries),
  };
}

function buildOperationsRevenueRows(dataset: {
  administrators: AdministratorRow[];
  clients: ClientRow[];
  contracts: ContractRow[];
  revenueEntries: RevenueEntryRow[];
}): OperationsRevenueRow[] {
  const contractsById = new Map(
    dataset.contracts.map((contract) => [contract.id, contract]),
  );
  const clientsById = new Map(
    dataset.clients.map((client) => [
      client.id,
      normalizeText(client.name) || "Cliente sem nome",
    ]),
  );
  const administratorsById = new Map(
    dataset.administrators.map((administrator) => [
      administrator.id,
      normalizeText(administrator.name) || "Administradora sem nome",
    ]),
  );

  return dataset.revenueEntries.map((entry) => {
    const contract = entry.contract_id
      ? contractsById.get(entry.contract_id) ?? null
      : null;
    const clientId = entry.client_id ?? contract?.client_id ?? null;
    const administratorId =
      entry.administrator_id ?? contract?.administrator_id ?? null;
    const expectedAmount = normalizeNumber(entry.expected_amount) ?? 0;
    const recognizedAmount =
      entry.status === "paid"
        ? normalizeNumber(entry.actual_amount) ?? expectedAmount
        : normalizeNumber(entry.actual_amount) ?? 0;
    const attentionItems = buildRevenueAttentionItems({
      administratorId,
      clientId,
      contract,
      contractId: entry.contract_id,
      expectedAmount,
      recognizedAmount,
      status: entry.status,
    });

    return {
      administratorName: administratorId
        ? administratorsById.get(administratorId) ??
          "Administradora nao encontrada"
        : "Administradora nao vinculada",
      attentionItems,
      clientName: clientId
        ? clientsById.get(clientId) ?? "Cliente nao encontrado"
        : "Cliente nao vinculado",
      contractId: entry.contract_id ?? "",
      contractNumber: normalizeNullableText(contract?.contract_number) ?? undefined,
      dueDate: entry.due_date ?? undefined,
      expectedAmount,
      id: entry.id,
      paidAt: entry.paid_at ?? undefined,
      recognizedAmount,
      status: resolveOperationsRevenueStatus(entry.status, attentionItems),
    };
  });
}

function summarizeRevenue(
  entries: OperationsRevenueRow[],
): OperationsRevenueResponse["summary"] {
  const summary = entries.reduce(
    (current, entry) => ({
      divergentEntries:
        current.divergentEntries + (entry.attentionItems.length ? 1 : 0),
      expectedRevenue: roundCurrency(
        current.expectedRevenue + entry.expectedAmount,
      ),
      pendingRevenue: roundCurrency(
        current.pendingRevenue +
          (entry.status === "expected" || entry.status === "pending"
            ? entry.expectedAmount
            : 0),
      ),
      recognizedRevenue: roundCurrency(
        current.recognizedRevenue + entry.recognizedAmount,
      ),
      totalEntries: current.totalEntries + 1,
    }),
    {
      divergentEntries: 0,
      expectedRevenue: 0,
      pendingRevenue: 0,
      recognizedRevenue: 0,
      totalEntries: 0,
    },
  );

  return {
    ...summary,
    recognizedPercentage:
      summary.expectedRevenue > 0
        ? roundPercentage((summary.recognizedRevenue / summary.expectedRevenue) * 100)
        : 0,
  };
}

function buildRevenueAttentionItems(input: {
  administratorId: string | null;
  clientId: string | null;
  contract: ContractRow | null;
  contractId: string | null;
  expectedAmount: number;
  recognizedAmount: number;
  status: string | null;
}) {
  const attentionItems: string[] = [];

  if (!input.contractId || !input.contract) {
    attentionItems.push("missing contract");
  }

  if (!input.clientId) {
    attentionItems.push("missing client");
  }

  if (!input.administratorId) {
    attentionItems.push("missing administrator");
  }

  if (input.expectedAmount <= 0) {
    attentionItems.push("expected revenue equals zero");
  }

  if (input.recognizedAmount > input.expectedAmount) {
    attentionItems.push("recognized revenue greater than expected");
  }

  if (input.status === "paid" && (!input.contractId || !input.contract)) {
    attentionItems.push("payment without valid contract");
  }

  return attentionItems;
}

function resolveOperationsRevenueStatus(
  status: string | null,
  attentionItems: string[],
): OperationsRevenueStatus {
  if (attentionItems.length > 0) {
    return "attention";
  }

  if (status === "paid") {
    return "recognized";
  }

  if (status === "pending" || status === "overdue") {
    return "pending";
  }

  if (status === "cancelled") {
    return "cancelled";
  }

  return "expected";
}

async function loadOperationsRevenueDataset(context: RequestContext) {
  const [revenueResult, contractsResult, clientsResult, administratorsResult] =
    await Promise.all([
      context.supabase
        .from("revenue_entries")
        .select(
          [
            "id",
            "organization_id",
            "contract_id",
            "client_id",
            "administrator_id",
            "status",
            "expected_amount",
            "actual_amount",
            "due_date",
            "paid_at",
          ].join(","),
        )
        .eq("organization_id", context.profile.organization_id),
      context.supabase
        .from("contracts")
        .select(
          [
            "id",
            "organization_id",
            "client_id",
            "administrator_id",
            "contract_number",
          ].join(","),
        )
        .eq("organization_id", context.profile.organization_id),
      context.supabase
        .from("clients")
        .select("id, organization_id, name")
        .eq("organization_id", context.profile.organization_id),
      context.supabase
        .from("administrators")
        .select("id, organization_id, name")
        .eq("organization_id", context.profile.organization_id),
    ]);

  if (
    revenueResult.error ||
    contractsResult.error ||
    clientsResult.error ||
    administratorsResult.error
  ) {
    return {
      error: "Nao foi possivel carregar as receitas operacionais.",
      ok: false as const,
      status: 500,
    };
  }

  return {
    administrators: (
      (administratorsResult.data ?? []) as unknown as AdministratorRow[]
    ).filter(
      (administrator) =>
        administrator.organization_id === context.profile.organization_id,
    ),
    clients: ((clientsResult.data ?? []) as unknown as ClientRow[]).filter(
      (client) => client.organization_id === context.profile.organization_id,
    ),
    contracts: ((contractsResult.data ?? []) as unknown as ContractRow[]).filter(
      (contract) => contract.organization_id === context.profile.organization_id,
    ),
    ok: true as const,
    revenueEntries: (
      (revenueResult.data ?? []) as unknown as RevenueEntryRow[]
    ).filter(
      (entry) => entry.organization_id === context.profile.organization_id,
    ),
  };
}

function createServerOperationsRevenueSupabaseClient(accessToken: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !publishableKey) {
    throw new Error(
      "Supabase operations revenue server environment is not configured.",
    );
  }

  return createClient(supabaseUrl, publishableKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}

async function resolveOperationsRevenueRequestContext(
  accessToken: string | null,
) {
  if (!accessToken) {
    return {
      error: "Sessao invalida.",
      ok: false as const,
      status: 401,
    };
  }

  try {
    const supabase = createServerOperationsRevenueSupabaseClient(accessToken);
    const { data: userData, error: userError } =
      await supabase.auth.getUser(accessToken);

    if (userError || !userData.user) {
      return {
        error: "Sessao invalida.",
        ok: false as const,
        status: 401,
      };
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, organization_id, role, is_active")
      .eq("id", userData.user.id)
      .maybeSingle<OperationsRevenueProfile>();

    if (profileError || !isValidProfile(profile)) {
      return {
        error: "Perfil nao encontrado.",
        ok: false as const,
        status: 403,
      };
    }

    return {
      ok: true as const,
      profile,
      supabase,
      user: userData.user,
    };
  } catch {
    return {
      error: genericAccessError,
      ok: false as const,
      status: 500,
    };
  }
}

function isValidProfile(
  profile: OperationsRevenueProfile | null,
): profile is OperationsRevenueProfile & {
  is_active: true;
  organization_id: string;
  role: "admin" | "master" | "sdr";
} {
  return Boolean(
    profile?.id &&
      profile.organization_id &&
      profile.is_active === true &&
      (profile.role === "admin" ||
        profile.role === "master" ||
        profile.role === "sdr"),
  );
}

function normalizeNullableText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed || null;
}

function normalizeText(value: unknown) {
  return normalizeNullableText(value) ?? "";
}

function normalizeNumber(value: number | string | null) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function roundPercentage(value: number) {
  return Math.round((value + Number.EPSILON) * 10) / 10;
}
