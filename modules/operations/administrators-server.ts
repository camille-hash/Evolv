import { createClient, type User as SupabaseUser } from "@supabase/supabase-js";
import type {
  OperationsAdministratorRow,
  OperationsAdministratorsResponse,
  OperationsAdministratorStatus,
} from "./administrators-types";

type OperationsAdministratorsProfile = {
  id: string;
  is_active: boolean | null;
  organization_id: string | null;
  role: string | null;
};

type AdministratorRow = {
  created_at: string | null;
  id: string;
  name: string | null;
  organization_id: string | null;
  status: string | null;
  updated_at: string | null;
};

type ContractRow = {
  administrator_id: string | null;
  client_id: string | null;
  contract_number: string | null;
  credit_amount: number | string | null;
  id: string;
  organization_id: string | null;
  status: string | null;
};

type RevenueEntryRow = {
  actual_amount: number | string | null;
  contract_id: string | null;
  expected_amount: number | string | null;
  organization_id: string | null;
  status: string | null;
};

type RequestContext = {
  profile: OperationsAdministratorsProfile & {
    is_active: true;
    organization_id: string;
    role: "admin" | "master" | "sdr";
  };
  supabase: ReturnType<typeof createServerOperationsAdministratorsSupabaseClient>;
  user: SupabaseUser;
};

type AdministratorAccumulator = {
  activeContractsCount: number;
  attentionItems: Set<string>;
  clients: Set<string>;
  contractsCount: number;
  createdAt: string | null;
  estimatedRevenue: number;
  id: string;
  name: string;
  recognizedRevenue: number;
  sourceStatus: string | null;
  totalCreditValue: number;
  updatedAt: string | null;
};

export type OperationsAdministratorsResult =
  | ({ ok: true } & OperationsAdministratorsResponse)
  | { error: string; ok: false; status: number };

const exposureThreshold = 60;
const genericAccessError =
  "Nao foi possivel concluir a operacao. Entre em contato com o administrador.";

export async function listOperationsAdministrators(
  accessToken: string | null,
): Promise<OperationsAdministratorsResult> {
  const context = await resolveOperationsAdministratorsRequestContext(accessToken);

  if (!context.ok) {
    return context;
  }

  const dataset = await loadOperationsAdministratorsDataset(context);

  if (!dataset.ok) {
    return dataset;
  }

  const administrators = buildOperationsAdministratorRows(dataset);

  return {
    administrators,
    ok: true,
    summary: summarizeAdministrators(administrators),
  };
}

function buildOperationsAdministratorRows(dataset: {
  administrators: AdministratorRow[];
  contracts: ContractRow[];
  revenueEntries: RevenueEntryRow[];
}): OperationsAdministratorRow[] {
  const revenueByContractId = groupRevenueByContractId(dataset.revenueEntries);
  const totalCreditValue = roundCurrency(
    dataset.contracts.reduce(
      (total, contract) => total + (normalizeNumber(contract.credit_amount) ?? 0),
      0,
    ),
  );
  const administrators = new Map<string, AdministratorAccumulator>();

  for (const administrator of dataset.administrators) {
    administrators.set(administrator.id, {
      activeContractsCount: 0,
      attentionItems: new Set<string>(),
      clients: new Set<string>(),
      contractsCount: 0,
      createdAt: administrator.created_at,
      estimatedRevenue: 0,
      id: administrator.id,
      name: normalizeText(administrator.name) || "Administradora sem nome",
      recognizedRevenue: 0,
      sourceStatus: administrator.status,
      totalCreditValue: 0,
      updatedAt: administrator.updated_at ?? administrator.created_at,
    });
  }

  for (const contract of dataset.contracts) {
    if (!contract.administrator_id) {
      continue;
    }

    const administrator =
      administrators.get(contract.administrator_id) ??
      createMissingAdministratorAccumulator(contract.administrator_id);
    const revenueEntries = revenueByContractId.get(contract.id) ?? [];
    const creditValue = normalizeNumber(contract.credit_amount) ?? 0;
    const estimatedRevenue = sumEstimatedRevenue(revenueEntries);
    const recognizedRevenue = sumRecognizedRevenue(revenueEntries);

    administrator.contractsCount += 1;
    administrator.totalCreditValue = roundCurrency(
      administrator.totalCreditValue + creditValue,
    );
    administrator.estimatedRevenue = roundCurrency(
      administrator.estimatedRevenue + estimatedRevenue,
    );
    administrator.recognizedRevenue = roundCurrency(
      administrator.recognizedRevenue + recognizedRevenue,
    );

    if (contract.status === "active") {
      administrator.activeContractsCount += 1;
    }

    if (contract.client_id) {
      administrator.clients.add(contract.client_id);
    }

    for (const attentionItem of buildContractAttentionItems({
      clientId: contract.client_id,
      contractNumber: contract.contract_number,
      creditValue,
      estimatedRevenue,
      isActiveContract: contract.status === "active",
      recognizedRevenue,
    })) {
      administrator.attentionItems.add(attentionItem);
    }

    administrators.set(contract.administrator_id, administrator);
  }

  return Array.from(administrators.values())
    .map((administrator) => {
      if (administrator.contractsCount === 0) {
        administrator.attentionItems.add("administrator without linked contract");
      }

      const exposurePercentage =
        totalCreditValue > 0
          ? roundPercentage(
              (administrator.totalCreditValue / totalCreditValue) * 100,
            )
          : 0;

      if (exposurePercentage > exposureThreshold) {
        administrator.attentionItems.add(
          "administrator concentrates more than 60% of portfolio",
        );
      }

      return {
        activeContractsCount: administrator.activeContractsCount,
        attentionItems: Array.from(administrator.attentionItems),
        clientsCount: administrator.clients.size,
        contractsCount: administrator.contractsCount,
        createdAt: administrator.createdAt ?? undefined,
        estimatedRevenue: administrator.estimatedRevenue,
        exposurePercentage,
        id: administrator.id,
        name: administrator.name,
        recognizedRevenue: administrator.recognizedRevenue,
        status: resolveAdministratorStatus({
          attentionItemsCount: administrator.attentionItems.size,
          contractsCount: administrator.contractsCount,
          exposurePercentage,
          sourceStatus: administrator.sourceStatus,
        }),
        totalCreditValue: administrator.totalCreditValue,
        updatedAt: administrator.updatedAt ?? undefined,
      };
    })
    .sort((left, right) => right.totalCreditValue - left.totalCreditValue);
}

function summarizeAdministrators(
  administrators: OperationsAdministratorRow[],
): OperationsAdministratorsResponse["summary"] {
  return administrators.reduce(
    (summary, administrator) => ({
      activeAdministrators:
        summary.activeAdministrators +
        (administrator.status !== "inactive" ? 1 : 0),
      administratorsWithAttention:
        summary.administratorsWithAttention +
        (administrator.attentionItems.length ? 1 : 0),
      administratorsWithContracts:
        summary.administratorsWithContracts +
        (administrator.contractsCount > 0 ? 1 : 0),
      administratorsWithoutContracts:
        summary.administratorsWithoutContracts +
        (administrator.contractsCount === 0 ? 1 : 0),
      estimatedRevenue: roundCurrency(
        summary.estimatedRevenue + administrator.estimatedRevenue,
      ),
      largestExposurePercentage: Math.max(
        summary.largestExposurePercentage,
        administrator.exposurePercentage,
      ),
      recognizedRevenue: roundCurrency(
        summary.recognizedRevenue + administrator.recognizedRevenue,
      ),
      totalAdministrators: summary.totalAdministrators + 1,
      totalCreditValue: roundCurrency(
        summary.totalCreditValue + administrator.totalCreditValue,
      ),
    }),
    {
      activeAdministrators: 0,
      administratorsWithAttention: 0,
      administratorsWithContracts: 0,
      administratorsWithoutContracts: 0,
      estimatedRevenue: 0,
      largestExposurePercentage: 0,
      recognizedRevenue: 0,
      totalAdministrators: 0,
      totalCreditValue: 0,
    },
  );
}

function buildContractAttentionItems(input: {
  clientId: string | null;
  contractNumber: string | null;
  creditValue: number;
  estimatedRevenue: number;
  isActiveContract: boolean;
  recognizedRevenue: number;
}) {
  const attentionItems: string[] = [];

  if (!input.clientId) {
    attentionItems.push("linked contract without client");
  }

  if (!normalizeNullableText(input.contractNumber)) {
    attentionItems.push("linked contract without contract number");
  }

  if (input.creditValue <= 0) {
    attentionItems.push("linked contract with zero credit value");
  }

  if (input.isActiveContract && input.estimatedRevenue <= 0) {
    attentionItems.push("active linked contract with zero estimated revenue");
  }

  if (input.recognizedRevenue > input.estimatedRevenue) {
    attentionItems.push("recognized revenue greater than estimated revenue");
  }

  return attentionItems;
}

function resolveAdministratorStatus(input: {
  attentionItemsCount: number;
  contractsCount: number;
  exposurePercentage: number;
  sourceStatus: string | null;
}): OperationsAdministratorStatus {
  if (input.contractsCount === 0 || input.sourceStatus === "inactive") {
    return "inactive";
  }

  if (input.exposurePercentage > exposureThreshold) {
    return "concentrated";
  }

  if (input.attentionItemsCount > 0) {
    return "attention";
  }

  return "healthy";
}

function createMissingAdministratorAccumulator(
  administratorId: string,
): AdministratorAccumulator {
  return {
    activeContractsCount: 0,
    attentionItems: new Set<string>(),
    clients: new Set<string>(),
    contractsCount: 0,
    createdAt: null,
    estimatedRevenue: 0,
    id: administratorId,
    name: "Administradora nao encontrada",
    recognizedRevenue: 0,
    sourceStatus: null,
    totalCreditValue: 0,
    updatedAt: null,
  };
}

async function loadOperationsAdministratorsDataset(context: RequestContext) {
  const [administratorsResult, contractsResult, revenueResult] =
    await Promise.all([
      context.supabase
        .from("administrators")
        .select(
          [
            "id",
            "organization_id",
            "name",
            "status",
            "created_at",
            "updated_at",
          ].join(","),
        )
        .eq("organization_id", context.profile.organization_id),
      context.supabase
        .from("contracts")
        .select(
          [
            "id",
            "organization_id",
            "administrator_id",
            "client_id",
            "contract_number",
            "status",
            "credit_amount",
          ].join(","),
        )
        .eq("organization_id", context.profile.organization_id),
      context.supabase
        .from("revenue_entries")
        .select(
          [
            "organization_id",
            "contract_id",
            "status",
            "expected_amount",
            "actual_amount",
          ].join(","),
        )
        .eq("organization_id", context.profile.organization_id),
    ]);

  if (administratorsResult.error || contractsResult.error || revenueResult.error) {
    return {
      error: "Nao foi possivel carregar as administradoras operacionais.",
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

function createServerOperationsAdministratorsSupabaseClient(accessToken: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !publishableKey) {
    throw new Error(
      "Supabase operations administrators server environment is not configured.",
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

async function resolveOperationsAdministratorsRequestContext(
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
    const supabase =
      createServerOperationsAdministratorsSupabaseClient(accessToken);
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
      .maybeSingle<OperationsAdministratorsProfile>();

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

function groupRevenueByContractId(revenueEntries: RevenueEntryRow[]) {
  const groupedEntries = new Map<string, RevenueEntryRow[]>();

  for (const entry of revenueEntries) {
    if (!entry.contract_id) {
      continue;
    }

    groupedEntries.set(entry.contract_id, [
      ...(groupedEntries.get(entry.contract_id) ?? []),
      entry,
    ]);
  }

  return groupedEntries;
}

function sumEstimatedRevenue(revenueEntries: RevenueEntryRow[]) {
  return roundCurrency(
    revenueEntries.reduce((total, entry) => {
      if (entry.status !== "expected" && entry.status !== "pending") {
        return total;
      }

      return total + (normalizeNumber(entry.expected_amount) ?? 0);
    }, 0),
  );
}

function sumRecognizedRevenue(revenueEntries: RevenueEntryRow[]) {
  return roundCurrency(
    revenueEntries.reduce((total, entry) => {
      if (entry.status !== "paid") {
        return total;
      }

      return (
        total +
        (normalizeNumber(entry.actual_amount) ??
          normalizeNumber(entry.expected_amount) ??
          0)
      );
    }, 0),
  );
}

function isValidProfile(
  profile: OperationsAdministratorsProfile | null,
): profile is OperationsAdministratorsProfile & {
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
