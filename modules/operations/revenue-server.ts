import { createClient, type User as SupabaseUser } from "@supabase/supabase-js";
import type {
  OperationsRevenueDailyPanel,
  OperationsRevenueFilterOptions,
  OperationsRevenueQuery,
  OperationsRevenueResponse,
  OperationsRevenueRow,
  OperationsRevenueSortField,
  OperationsRevenueSortOrder,
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

type ExpectedRevenueEntryRow = {
  business_status: string | null;
  cancelled_at: string | null;
  contract_id: string | null;
  created_at: string | null;
  expected_amount: number | string | null;
  expected_date: string | null;
  id: string;
  lifecycle: string | null;
  organization_id: string | null;
  updated_at: string | null;
};

type RecognizedRevenueEntryRow = {
  expected_revenue_entry_id: string | null;
  organization_id: string | null;
  recognized_amount: number | string | null;
  recognized_at: string | null;
  reversed_at: string | null;
};

type ContractRow = {
  administrator_id: string | null;
  client_id: string | null;
  commission_plan_id: string | null;
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

type CommissionPlanRow = {
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

type NormalizedOperationsRevenueQuery = {
  administratorId: string | null;
  clientId: string | null;
  competency: string | null;
  contract: string | null;
  contractId: string | null;
  dueFrom: string | null;
  dueTo: string | null;
  entryId: string | null;
  maxAmount: number | null;
  minAmount: number | null;
  order: OperationsRevenueSortOrder;
  page: number;
  pageSize: number;
  search: string | null;
  sort: OperationsRevenueSortField;
  status: OperationsRevenueStatus | null;
};

type ParsedOperationsRevenueQueryResult =
  | { input: NormalizedOperationsRevenueQuery; ok: true }
  | { error: string; ok: false; status: number };

export type OperationsRevenueResult =
  | ({ ok: true } & OperationsRevenueResponse)
  | { error: string; ok: false; status: number };

const genericAccessError =
  "Nao foi possivel concluir a operacao. Entre em contato com o administrador.";

const defaultPage = 1;
const defaultPageSize = 25;
const maxPageSize = 100;

const statusFilterOptions: OperationsRevenueFilterOptions["statuses"] = [
  { label: "Com problema", value: "attention" },
  { label: "Cancelada", value: "cancelled" },
  { label: "Prevista", value: "expected" },
  { label: "Parcial", value: "pending" },
  { label: "Reconhecida", value: "recognized" },
];

export function parseOperationsRevenueQuery(
  searchParams: URLSearchParams,
): ParsedOperationsRevenueQueryResult {
  const parsedPage = parseIntegerParam(searchParams.get("page"));
  const parsedPageSize = parseIntegerParam(searchParams.get("pageSize"));
  const parsedMinAmount = parseNumberParam(searchParams.get("minAmount"));
  const parsedMaxAmount = parseNumberParam(searchParams.get("maxAmount"));
  const status = normalizeStatusParam(searchParams.get("status"));
  const sort = normalizeSortParam(searchParams.get("sort"));
  const order = normalizeOrderParam(searchParams.get("order"));
  const competency = normalizeCompetency(searchParams.get("competency"));
  const dueFrom = normalizeDateParam(searchParams.get("dueFrom"));
  const dueTo = normalizeDateParam(searchParams.get("dueTo"));

  if (searchParams.get("page") && parsedPage === undefined) {
    return invalid("Pagina invalida.");
  }

  if (searchParams.get("pageSize") && parsedPageSize === undefined) {
    return invalid("Tamanho de pagina invalido.");
  }

  if (searchParams.get("minAmount") && parsedMinAmount === undefined) {
    return invalid("Valor minimo invalido.");
  }

  if (searchParams.get("maxAmount") && parsedMaxAmount === undefined) {
    return invalid("Valor maximo invalido.");
  }

  if (searchParams.get("status") && status === undefined) {
    return invalid("Status operacional invalido.");
  }

  if (searchParams.get("sort") && sort === undefined) {
    return invalid("Ordenacao invalida.");
  }

  if (searchParams.get("order") && order === undefined) {
    return invalid("Direcao de ordenacao invalida.");
  }

  if (searchParams.get("competency") && competency === undefined) {
    return invalid("Competencia invalida.");
  }

  if (searchParams.get("dueFrom") && dueFrom === undefined) {
    return invalid("Data inicial invalida.");
  }

  if (searchParams.get("dueTo") && dueTo === undefined) {
    return invalid("Data final invalida.");
  }

  if (
    parsedMinAmount !== null &&
    parsedMinAmount !== undefined &&
    parsedMaxAmount !== null &&
    parsedMaxAmount !== undefined &&
    parsedMinAmount > parsedMaxAmount
  ) {
    return invalid("O valor minimo nao pode ser maior que o valor maximo.");
  }

  if (
    dueFrom &&
    dueFrom !== undefined &&
    dueTo &&
    dueTo !== undefined &&
    dueFrom > dueTo
  ) {
    return invalid("A data inicial nao pode ser maior que a data final.");
  }

  return {
    input: normalizeOperationsRevenueQuery({
      administratorId: normalizeNullableText(searchParams.get("administratorId")),
      clientId: normalizeNullableText(searchParams.get("clientId")),
      competency: competency ?? null,
      contract: normalizeNullableText(searchParams.get("contract")),
      contractId: normalizeNullableText(searchParams.get("contractId")),
      dueFrom: dueFrom ?? null,
      dueTo: dueTo ?? null,
      entryId: normalizeNullableText(searchParams.get("entryId")),
      maxAmount: parsedMaxAmount ?? null,
      minAmount: parsedMinAmount ?? null,
      order: order ?? "asc",
      page: parsedPage ?? defaultPage,
      pageSize: parsedPageSize ?? defaultPageSize,
      search: normalizeNullableText(searchParams.get("search")),
      sort: sort ?? "vencimento",
      status: status ?? null,
    }),
    ok: true,
  };
}

export async function listOperationsRevenue(
  accessToken: string | null,
  query?: OperationsRevenueQuery,
): Promise<OperationsRevenueResult> {
  const context = await resolveOperationsRevenueRequestContext(accessToken);

  if (!context.ok) {
    return context;
  }

  const normalizedQuery = normalizeOperationsRevenueQuery(query);
  const dataset = await loadOperationsRevenueDataset(context);

  if (!dataset.ok) {
    return dataset;
  }

  const allEntries = buildOperationsRevenueRows(dataset);
  const filteredEntries = filterOperationsRevenueRows(allEntries, normalizedQuery);
  const sortedEntries = sortOperationsRevenueRows(filteredEntries, normalizedQuery);
  const summary = summarizeRevenue(filteredEntries);
  const dailyPanel = buildOperationsRevenueDailyPanel(filteredEntries);
  const pagination = paginateRevenueEntries(sortedEntries, normalizedQuery);

  return {
    dailyPanel,
    entries: pagination.entries,
    filters: buildOperationsRevenueFilterOptions(dataset),
    ok: true,
    pagination: pagination.pagination,
    summary,
  };
}

function buildOperationsRevenueRows(dataset: {
  administrators: AdministratorRow[];
  clients: ClientRow[];
  commissionPlans: CommissionPlanRow[];
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
  const commissionPlansById = new Map(
    dataset.commissionPlans.map((plan) => [
      plan.id,
      normalizeText(plan.name) || "Plano sem nome",
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
    const dueDateKey = normalizeDateKey(entry.due_date);
    const planId = contract?.commission_plan_id ?? null;
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
      administratorId: administratorId ?? undefined,
      administratorName: administratorId
        ? administratorsById.get(administratorId) ??
          "Administradora nao encontrada"
        : "Administradora nao vinculada",
      attentionItems,
      clientId: clientId ?? undefined,
      clientName: clientId
        ? clientsById.get(clientId) ?? "Cliente nao encontrado"
        : "Cliente nao vinculado",
      competency: dueDateKey ? dueDateKey.slice(0, 7) : undefined,
      contractId: entry.contract_id ?? "",
      contractNumber: normalizeNullableText(contract?.contract_number) ?? undefined,
      dueDate: dueDateKey ?? undefined,
      expectedAmount,
      id: entry.id,
      paidAt: normalizeDateTime(entry.paid_at) ?? undefined,
      planId: planId ?? undefined,
      planName: planId ? commissionPlansById.get(planId) ?? undefined : undefined,
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
            ? Math.max(entry.expectedAmount - entry.recognizedAmount, 0)
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
        ? roundPercentage(
            (summary.recognizedRevenue / summary.expectedRevenue) * 100,
          )
        : 0,
  };
}

function buildOperationsRevenueDailyPanel(
  entries: OperationsRevenueRow[],
): OperationsRevenueDailyPanel {
  const todayKey = getBrazilCivilDateKey(new Date());
  const tomorrowKey = shiftDateKey(todayKey, 1);
  const overdueEntries = entries.filter(
    (entry) => isOpenRevenueStatus(entry.status) && Boolean(entry.dueDate) && entry.dueDate! < todayKey,
  );
  const dueTodayEntries = entries.filter((entry) => entry.dueDate === todayKey);
  const dueTomorrowEntries = entries.filter((entry) => entry.dueDate === tomorrowKey);
  const receivedTodayEntries = entries.filter((entry) =>
    normalizeDateKey(entry.paidAt) === todayKey,
  );
  const expectedTodayTotal = roundCurrency(
    dueTodayEntries.reduce((total, entry) => total + entry.expectedAmount, 0),
  );
  const criticalEntries = [...entries]
    .filter(
      (entry) =>
        isOpenRevenueStatus(entry.status) &&
        Boolean(entry.dueDate) &&
        (entry.expectedAmount - entry.recognizedAmount > 0 || entry.status === "expected" || entry.status === "pending" || entry.status === "attention"),
    )
    .sort((left, right) => {
      const leftDaysOverdue = calculateDaysOverdue(left.dueDate, todayKey);
      const rightDaysOverdue = calculateDaysOverdue(right.dueDate, todayKey);

      if (leftDaysOverdue !== rightDaysOverdue) {
        return rightDaysOverdue - leftDaysOverdue;
      }

      if (left.expectedAmount !== right.expectedAmount) {
        return right.expectedAmount - left.expectedAmount;
      }

      return (left.dueDate ?? "9999-12-31").localeCompare(
        right.dueDate ?? "9999-12-31",
        "pt-BR",
      );
    })
    .slice(0, 10)
    .map((entry) => ({
      administratorName: entry.administratorName,
      clientName: entry.clientName,
      contractId: entry.contractId,
      contractNumber: entry.contractNumber,
      daysOverdue: calculateDaysOverdue(entry.dueDate, todayKey),
      dueDate: entry.dueDate,
      expectedAmount: entry.expectedAmount,
      id: entry.id,
      status: entry.status,
    }));

  return {
    criticalEntries,
    dueToday: summarizeDailyMetric(dueTodayEntries),
    dueTomorrow: summarizeDailyMetric(dueTomorrowEntries),
    expectedToday: {
      totalAmount: expectedTodayTotal,
    },
    overdue: summarizeDailyMetric(overdueEntries),
    receivedToday: {
      count: receivedTodayEntries.length,
      totalAmount: roundCurrency(
        receivedTodayEntries.reduce(
          (total, entry) => total + entry.recognizedAmount,
          0,
        ),
      ),
    },
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
    attentionItems.push("Contrato nao vinculado corretamente.");
  }

  if (!input.clientId) {
    attentionItems.push("Cliente nao vinculado.");
  }

  if (!input.administratorId) {
    attentionItems.push("Administradora nao vinculada.");
  }

  if (input.expectedAmount <= 0) {
    attentionItems.push("Valor previsto igual a zero.");
  }

  if (input.recognizedAmount > input.expectedAmount) {
    attentionItems.push("Valor reconhecido maior que o valor previsto.");
  }

  if (input.status === "paid" && (!input.contractId || !input.contract)) {
    attentionItems.push("Receita reconhecida sem contrato valido.");
  }

  return attentionItems;
}

function summarizeDailyMetric(entries: OperationsRevenueRow[]) {
  return {
    count: entries.length,
    totalAmount: roundCurrency(
      entries.reduce((total, entry) => total + entry.expectedAmount, 0),
    ),
  };
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
  const [
    revenueResult,
    expectedRevenueResult,
    recognizedRevenueResult,
    contractsResult,
    clientsResult,
    administratorsResult,
    commissionPlansResult,
  ] = await Promise.all([
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
      .from("expected_revenue_entries")
      .select(
        [
          "id",
          "organization_id",
          "contract_id",
          "expected_amount",
          "expected_date",
          "created_at",
          "updated_at",
          "cancelled_at",
          "lifecycle",
          "business_status",
        ].join(","),
      )
      .eq("organization_id", context.profile.organization_id),
    context.supabase
      .from("recognized_revenue_entries")
      .select(
        [
          "organization_id",
          "expected_revenue_entry_id",
          "recognized_amount",
          "recognized_at",
          "reversed_at",
        ].join(","),
      )
      .eq("organization_id", context.profile.organization_id)
      .is("reversed_at", null),
    context.supabase
      .from("contracts")
      .select(
        [
          "id",
          "organization_id",
          "client_id",
          "administrator_id",
          "contract_number",
          "commission_plan_id",
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
    context.supabase
      .from("commission_plans")
      .select("id, organization_id, name")
      .eq("organization_id", context.profile.organization_id),
  ]);

  if (
    revenueResult.error ||
    expectedRevenueResult.error ||
    recognizedRevenueResult.error ||
    contractsResult.error ||
    clientsResult.error ||
    administratorsResult.error ||
    commissionPlansResult.error
  ) {
    return {
      error: "Nao foi possivel carregar as receitas operacionais.",
      ok: false as const,
      status: 500,
    };
  }

  const contracts = ((contractsResult.data ?? []) as unknown as ContractRow[]).filter(
    (contract) => contract.organization_id === context.profile.organization_id,
  );

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
    commissionPlans: (
      (commissionPlansResult.data ?? []) as unknown as CommissionPlanRow[]
    ).filter((plan) => plan.organization_id === context.profile.organization_id),
    contracts,
    ok: true as const,
    revenueEntries: buildUnifiedRevenueEntries({
      contracts,
      expectedRevenueEntries: (
        (expectedRevenueResult.data ?? []) as unknown as ExpectedRevenueEntryRow[]
      ).filter(
        (entry) => entry.organization_id === context.profile.organization_id,
      ),
      legacyRevenueEntries: (
        (revenueResult.data ?? []) as unknown as RevenueEntryRow[]
      ).filter(
        (entry) => entry.organization_id === context.profile.organization_id,
      ),
      recognizedRevenueEntries: (
        (recognizedRevenueResult.data ?? []) as unknown as RecognizedRevenueEntryRow[]
      ).filter(
        (entry) => entry.organization_id === context.profile.organization_id,
      ),
    }),
  };
}

function buildUnifiedRevenueEntries(input: {
  contracts: ContractRow[];
  expectedRevenueEntries: ExpectedRevenueEntryRow[];
  legacyRevenueEntries: RevenueEntryRow[];
  recognizedRevenueEntries: RecognizedRevenueEntryRow[];
}) {
  const contractsById = new Map(
    input.contracts.map((contract) => [contract.id, contract]),
  );
  const recognizedRevenueByExpectedId = new Map<
    string,
    {
      latestRecognizedAt: string | null;
      recognizedAmount: number;
    }
  >();

  for (const entry of input.recognizedRevenueEntries) {
    if (!entry.expected_revenue_entry_id || entry.reversed_at) {
      continue;
    }

    const current = recognizedRevenueByExpectedId.get(
      entry.expected_revenue_entry_id,
    ) ?? {
      latestRecognizedAt: null,
      recognizedAmount: 0,
    };

    recognizedRevenueByExpectedId.set(entry.expected_revenue_entry_id, {
      latestRecognizedAt: resolveLatestDate(
        current.latestRecognizedAt,
        entry.recognized_at,
      ),
      recognizedAmount: roundCurrency(
        current.recognizedAmount +
          (normalizeNumber(entry.recognized_amount) ?? 0),
      ),
    });
  }

  const contractsWithCommissionRevenue = new Set<string>();
  const commissionEngineEntries: RevenueEntryRow[] = [];

  for (const entry of input.expectedRevenueEntries) {
    if (!entry.contract_id) {
      continue;
    }

    contractsWithCommissionRevenue.add(entry.contract_id);

    const contract = contractsById.get(entry.contract_id) ?? null;
    const recognizedRevenue =
      recognizedRevenueByExpectedId.get(entry.id) ?? null;
    const recognizedAmount = recognizedRevenue?.recognizedAmount ?? 0;
    const status = normalizeCommissionEngineRevenueStatus(
      entry,
      recognizedAmount,
    );
    const effectiveExpectedAmount = resolveOperationalExpectedAmount(
      entry,
      recognizedAmount,
    );

    if (status === "cancelled" && effectiveExpectedAmount <= 0) {
      continue;
    }

    commissionEngineEntries.push({
      actual_amount: recognizedAmount > 0 ? recognizedAmount : null,
      administrator_id: contract?.administrator_id ?? null,
      client_id: contract?.client_id ?? null,
      contract_id: entry.contract_id,
      due_date: entry.expected_date,
      expected_amount: effectiveExpectedAmount,
      id: entry.id,
      organization_id: entry.organization_id,
      paid_at:
        status === "paid"
          ? recognizedRevenue?.latestRecognizedAt ?? null
          : null,
      status,
    });
  }

  const legacyFallbackEntries = input.legacyRevenueEntries.filter(
    (entry) =>
      !entry.contract_id || !contractsWithCommissionRevenue.has(entry.contract_id),
  );

  return [...commissionEngineEntries, ...legacyFallbackEntries];
}

function filterOperationsRevenueRows(
  entries: OperationsRevenueRow[],
  query: NormalizedOperationsRevenueQuery,
) {
  return entries.filter((entry) => {
    if (query.entryId && entry.id !== query.entryId) {
      return false;
    }

    if (query.contractId && entry.contractId !== query.contractId) {
      return false;
    }

    if (query.status && entry.status !== query.status) {
      return false;
    }

    if (query.administratorId && entry.administratorId !== query.administratorId) {
      return false;
    }

    if (query.clientId && entry.clientId !== query.clientId) {
      return false;
    }

    if (query.contract) {
      const contractValue = normalizeSearchValue(
        entry.contractNumber ?? entry.contractId,
      );

      if (!contractValue.includes(normalizeSearchValue(query.contract))) {
        return false;
      }
    }

    if (query.competency && entry.competency !== query.competency) {
      return false;
    }

    if (query.dueFrom) {
      const dueDate = entry.dueDate ?? null;

      if (!dueDate || dueDate < query.dueFrom) {
        return false;
      }
    }

    if (query.dueTo) {
      const dueDate = entry.dueDate ?? null;

      if (!dueDate || dueDate > query.dueTo) {
        return false;
      }
    }

    if (query.minAmount !== null && entry.expectedAmount < query.minAmount) {
      return false;
    }

    if (query.maxAmount !== null && entry.expectedAmount > query.maxAmount) {
      return false;
    }

    if (query.search) {
      const searchValue = normalizeSearchValue(query.search);
      const haystack = [
        entry.clientName,
        entry.contractNumber,
        entry.contractId,
        entry.administratorName,
        entry.planName,
        entry.competency,
        entry.dueDate,
      ]
        .map((value) => normalizeSearchValue(value))
        .join(" ");

      if (!haystack.includes(searchValue)) {
        return false;
      }
    }

    return true;
  });
}

function sortOperationsRevenueRows(
  entries: OperationsRevenueRow[],
  query: NormalizedOperationsRevenueQuery,
) {
  const direction = query.order === "desc" ? -1 : 1;

  return [...entries].sort((left, right) => {
    const comparison = compareOperationsRevenueRows(left, right, query.sort);

    if (comparison !== 0) {
      return comparison * direction;
    }

    return compareOperationsRevenueRows(left, right, "vencimento");
  });
}

function compareOperationsRevenueRows(
  left: OperationsRevenueRow,
  right: OperationsRevenueRow,
  field: OperationsRevenueSortField,
) {
  if (field === "cliente") {
    return normalizeSearchValue(left.clientName).localeCompare(
      normalizeSearchValue(right.clientName),
      "pt-BR",
    );
  }

  if (field === "contrato") {
    return normalizeSearchValue(left.contractNumber ?? left.contractId).localeCompare(
      normalizeSearchValue(right.contractNumber ?? right.contractId),
      "pt-BR",
    );
  }

  if (field === "valor") {
    return left.expectedAmount - right.expectedAmount;
  }

  if (field === "status") {
    return left.status.localeCompare(right.status, "pt-BR");
  }

  const leftDate = left.dueDate ?? "9999-12-31";
  const rightDate = right.dueDate ?? "9999-12-31";

  return leftDate.localeCompare(rightDate, "pt-BR");
}

function paginateRevenueEntries(
  entries: OperationsRevenueRow[],
  query: NormalizedOperationsRevenueQuery,
) {
  const totalItems = entries.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / query.pageSize));
  const page = Math.min(query.page, totalPages);
  const startIndex = (page - 1) * query.pageSize;
  const endIndex = startIndex + query.pageSize;

  return {
    entries: entries.slice(startIndex, endIndex),
    pagination: {
      page,
      pageSize: query.pageSize,
      totalItems,
      totalPages,
    },
  };
}

function buildOperationsRevenueFilterOptions(dataset: {
  administrators: AdministratorRow[];
  clients: ClientRow[];
}) {
  return {
    administrators: dataset.administrators
      .map((administrator) => ({
        id: administrator.id,
        label: normalizeText(administrator.name) || "Administradora sem nome",
      }))
      .sort((left, right) => left.label.localeCompare(right.label, "pt-BR")),
    clients: dataset.clients
      .map((client) => ({
        id: client.id,
        label: normalizeText(client.name) || "Cliente sem nome",
      }))
      .sort((left, right) => left.label.localeCompare(right.label, "pt-BR")),
    statuses: statusFilterOptions,
  } satisfies OperationsRevenueFilterOptions;
}

function normalizeOperationsRevenueQuery(
  query: OperationsRevenueQuery | undefined,
): NormalizedOperationsRevenueQuery {
  return {
    administratorId: normalizeNullableText(query?.administratorId) ?? null,
    clientId: normalizeNullableText(query?.clientId) ?? null,
    competency: normalizeCompetency(query?.competency ?? null) ?? null,
    contract: normalizeNullableText(query?.contract) ?? null,
    contractId: normalizeNullableText(query?.contractId) ?? null,
    dueFrom: normalizeDateParam(query?.dueFrom ?? null) ?? null,
    dueTo: normalizeDateParam(query?.dueTo ?? null) ?? null,
    entryId: normalizeNullableText(query?.entryId) ?? null,
    maxAmount:
      typeof query?.maxAmount === "number" && Number.isFinite(query.maxAmount)
        ? query.maxAmount
        : null,
    minAmount:
      typeof query?.minAmount === "number" && Number.isFinite(query.minAmount)
        ? query.minAmount
        : null,
    order: normalizeOrderParam(query?.order) ?? "asc",
    page:
      typeof query?.page === "number" && Number.isInteger(query.page) && query.page > 0
        ? query.page
        : defaultPage,
    pageSize:
      typeof query?.pageSize === "number" &&
      Number.isInteger(query.pageSize) &&
      query.pageSize > 0
        ? Math.min(query.pageSize, maxPageSize)
        : defaultPageSize,
    search: normalizeNullableText(query?.search) ?? null,
    sort: normalizeSortParam(query?.sort) ?? "vencimento",
    status: normalizeStatusParam(query?.status) ?? null,
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

function parseIntegerParam(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function parseNumberParam(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = Number(value.replace(",", "."));

  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function normalizeStatusParam(value: string | null | undefined) {
  if (
    value === "attention" ||
    value === "cancelled" ||
    value === "expected" ||
    value === "pending" ||
    value === "recognized"
  ) {
    return value;
  }

  if (value === null || value === undefined || value === "") {
    return null;
  }

  return undefined;
}

function normalizeSortParam(value: string | null | undefined) {
  if (
    value === "cliente" ||
    value === "contrato" ||
    value === "status" ||
    value === "valor" ||
    value === "vencimento"
  ) {
    return value;
  }

  if (value === null || value === undefined || value === "") {
    return null;
  }

  return undefined;
}

function normalizeOrderParam(value: string | null | undefined) {
  if (value === "asc" || value === "desc") {
    return value;
  }

  if (value === null || value === undefined || value === "") {
    return null;
  }

  return undefined;
}

function normalizeCompetency(value: string | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  return /^\d{4}-\d{2}$/.test(value) ? value : undefined;
}

function normalizeDateParam(value: string | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return undefined;
  }

  return value;
}

function normalizeDateKey(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function normalizeDateTime(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function isOpenRevenueStatus(status: OperationsRevenueStatus) {
  return (
    status === "attention" ||
    status === "expected" ||
    status === "pending"
  );
}

function calculateDaysOverdue(
  dueDate: string | undefined,
  referenceDateKey: string,
) {
  if (!dueDate) {
    return 0;
  }

  const dueDateValue = new Date(`${dueDate}T00:00:00`);
  const referenceValue = new Date(`${referenceDateKey}T00:00:00`);

  if (
    Number.isNaN(dueDateValue.getTime()) ||
    Number.isNaN(referenceValue.getTime())
  ) {
    return 0;
  }

  return Math.max(
    0,
    Math.floor((referenceValue.getTime() - dueDateValue.getTime()) / 86_400_000),
  );
}

function getBrazilCivilDateKey(value: Date) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
    year: "numeric",
  });
  const parts = formatter.formatToParts(value);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    return [
      value.getFullYear(),
      String(value.getMonth() + 1).padStart(2, "0"),
      String(value.getDate()).padStart(2, "0"),
    ].join("-");
  }

  return [year, month, day].join("-");
}

function shiftDateKey(dateKey: string, days: number) {
  const baseDate = new Date(`${dateKey}T12:00:00`);

  baseDate.setDate(baseDate.getDate() + days);

  return [
    baseDate.getFullYear(),
    String(baseDate.getMonth() + 1).padStart(2, "0"),
    String(baseDate.getDate()).padStart(2, "0"),
  ].join("-");
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

function normalizeSearchValue(value: unknown) {
  return normalizeText(value)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
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

function normalizeCommissionEngineRevenueStatus(
  entry: ExpectedRevenueEntryRow,
  recognizedAmount: number,
) {
  if (entry.cancelled_at || entry.lifecycle === "cancelada") {
    return "cancelled";
  }

  if (
    entry.business_status === "reconhecida" ||
    entry.lifecycle === "encerrada"
  ) {
    return "paid";
  }

  if (
    entry.business_status === "parcialmente_reconhecida" ||
    recognizedAmount > 0
  ) {
    return "pending";
  }

  return "expected";
}

function resolveOperationalExpectedAmount(
  entry: ExpectedRevenueEntryRow,
  recognizedAmount: number,
) {
  if (entry.cancelled_at || entry.lifecycle === "cancelada") {
    return recognizedAmount;
  }

  return normalizeNumber(entry.expected_amount) ?? 0;
}

function resolveLatestDate(
  currentValue: string | null,
  nextValue: string | null,
) {
  if (!nextValue) {
    return currentValue;
  }

  if (!currentValue) {
    return nextValue;
  }

  return new Date(nextValue).getTime() >= new Date(currentValue).getTime()
    ? nextValue
    : currentValue;
}

function invalid(error: string): ParsedOperationsRevenueQueryResult {
  return {
    error,
    ok: false,
    status: 400,
  };
}
