import { createClient, type User as SupabaseUser } from "@supabase/supabase-js";
import type {
  OperationsTimelineEventType,
  OperationsTimelineItem,
  OperationsTimelineResponse,
  OperationsTimelineSeverity,
} from "./timeline-types";

type OperationsTimelineProfile = {
  id: string;
  is_active: boolean | null;
  organization_id: string | null;
  role: string | null;
};

type ClientRow = {
  created_at: string | null;
  id: string;
  name: string | null;
  organization_id: string | null;
  updated_at: string | null;
};

type ContractRow = {
  activated_at: string | null;
  approved_at: string | null;
  cancelled_at: string | null;
  client_id: string | null;
  completed_at: string | null;
  contract_number: string | null;
  created_at: string | null;
  credit_amount: number | string | null;
  id: string;
  metadata: unknown;
  organization_id: string | null;
  rejected_at: string | null;
  status: string | null;
  submitted_at: string | null;
};

type RecognizedRevenueEntryRow = {
  contract_id: string | null;
  expected_revenue_entry_id: string | null;
  id: string;
  organization_id: string | null;
  recognized_amount: number | string | null;
  recognized_at: string | null;
  reversed_at: string | null;
};

type RequestContext = {
  profile: OperationsTimelineProfile & {
    is_active: true;
    organization_id: string;
    role: "admin" | "master" | "sdr";
  };
  supabase: ReturnType<typeof createServerOperationsTimelineSupabaseClient>;
  user: SupabaseUser;
};

type ContractHistoryEvent = {
  action: string | null;
  fromStatus: string | null;
  notes: string | null;
  occurredAt: string | null;
  toStatus: string | null;
  type: string | null;
};

export type OperationsTimelineResult =
  | ({ ok: true } & OperationsTimelineResponse)
  | { error: string; ok: false; status: number };

const genericAccessError =
  "Nao foi possivel concluir a operacao. Entre em contato com o administrador.";

const timelineLimit = 40;

export async function listOperationsTimeline(
  accessToken: string | null,
): Promise<OperationsTimelineResult> {
  const context = await resolveOperationsTimelineRequestContext(accessToken);

  if (!context.ok) {
    return context;
  }

  const dataset = await loadOperationsTimelineDataset(context);

  if (!dataset.ok) {
    return dataset;
  }

  const clientsById = new Map(
    dataset.clients.map((client) => [
      client.id,
      normalizeText(client.name) || "Cliente sem nome",
    ]),
  );

  const items: OperationsTimelineItem[] = [
    ...dataset.clients.flatMap((client) => buildClientActivityItems(client)),
    ...dataset.contracts.flatMap((contract) =>
      buildContractActivityItems(contract, clientsById),
    ),
    ...dataset.recognizedRevenueEntries.flatMap((entry) =>
      buildRecognizedRevenueActivityItems(entry, dataset.contractsById, clientsById),
    ),
  ];

  return {
    items: items
      .filter((item) => isValidDate(item.occurredAt))
      .sort(
        (left, right) =>
          new Date(right.occurredAt).getTime() -
          new Date(left.occurredAt).getTime(),
      )
      .slice(0, timelineLimit),
    ok: true,
  };
}

async function loadOperationsTimelineDataset(context: RequestContext) {
  const [clientsResult, contractsResult, recognizedRevenueResult] =
    await Promise.all([
      context.supabase
        .from("clients")
        .select("id, organization_id, name, created_at, updated_at")
        .eq("organization_id", context.profile.organization_id),
      context.supabase
        .from("contracts")
        .select(
          [
            "id",
            "organization_id",
            "client_id",
            "contract_number",
            "status",
            "credit_amount",
            "created_at",
            "submitted_at",
            "approved_at",
            "activated_at",
            "completed_at",
            "cancelled_at",
            "rejected_at",
            "metadata",
          ].join(","),
        )
        .eq("organization_id", context.profile.organization_id),
      context.supabase
        .from("recognized_revenue_entries")
        .select(
          [
            "id",
            "organization_id",
            "contract_id",
            "expected_revenue_entry_id",
            "recognized_amount",
            "recognized_at",
            "reversed_at",
          ].join(","),
        )
        .eq("organization_id", context.profile.organization_id)
        .is("reversed_at", null),
    ]);

  if (
    clientsResult.error ||
    contractsResult.error ||
    recognizedRevenueResult.error
  ) {
    return {
      error: "Nao foi possivel carregar a atividade operacional.",
      ok: false as const,
      status: 500,
    };
  }

  const clients = ((clientsResult.data ?? []) as unknown as ClientRow[]).filter(
    (client) => client.organization_id === context.profile.organization_id,
  );
  const contracts = ((contractsResult.data ?? []) as unknown as ContractRow[])
    .filter(
      (contract) => contract.organization_id === context.profile.organization_id,
    );
  const recognizedRevenueEntries = (
    (recognizedRevenueResult.data ?? []) as unknown as RecognizedRevenueEntryRow[]
  ).filter(
    (entry) => entry.organization_id === context.profile.organization_id,
  );

  return {
    clients,
    contracts,
    contractsById: new Map(contracts.map((contract) => [contract.id, contract])),
    ok: true as const,
    recognizedRevenueEntries,
  };
}

function buildClientActivityItems(client: ClientRow) {
  if (!client.created_at) {
    return [];
  }

  return [
    createTimelineItem({
      area: "clients",
      description: `${normalizeText(client.name) || "Cliente sem nome"} entrou na base operacional.`,
      eventType: "client_created",
      href: "/operations/clients",
      id: `client-created:${client.id}`,
      occurredAt: client.created_at,
      severity: "info",
      title: "Cliente entrou na operacao",
    }),
  ];
}

function buildContractActivityItems(
  contract: ContractRow,
  clientsById: Map<string, string>,
) {
  const clientName = contract.client_id
    ? clientsById.get(contract.client_id) ?? "Cliente nao encontrado"
    : "Cliente nao vinculado";
  const contractLabel = resolveContractLabel(contract.contract_number);
  const creditLabel = formatCurrency(normalizeNumber(contract.credit_amount) ?? 0);
  const items: OperationsTimelineItem[] = [];

  if (contract.created_at) {
    items.push(
      createTimelineItem({
        area: "contracts",
        description: `${contractLabel} de ${clientName} foi cadastrado com ${creditLabel} em credito.`,
        eventType: "contract_created",
        href: buildContractHref(contract.id),
        id: `contract-created:${contract.id}`,
        occurredAt: contract.created_at,
        severity: "info",
        title: "Contrato cadastrado",
      }),
    );
  }

  if (contract.submitted_at && contract.submitted_at !== contract.created_at) {
    items.push(
      createTimelineItem({
        area: "contracts",
        description: `${contractLabel} de ${clientName} foi enviado para a proxima etapa operacional.`,
        eventType: "contract_submitted",
        href: buildContractHref(contract.id),
        id: `contract-submitted:${contract.id}`,
        occurredAt: contract.submitted_at,
        severity: "info",
        title: "Contrato enviado",
      }),
    );
  }

  if (contract.approved_at && contract.approved_at !== contract.created_at) {
    items.push(
      createTimelineItem({
        area: "contracts",
        description: `${contractLabel} de ${clientName} foi aprovado para seguir na operacao.`,
        eventType: "contract_approved",
        href: buildContractHref(contract.id),
        id: `contract-approved:${contract.id}`,
        occurredAt: contract.approved_at,
        severity: "info",
        title: "Contrato aprovado",
      }),
    );
  }

  if (contract.activated_at && contract.activated_at !== contract.created_at) {
    items.push(
      createTimelineItem({
        area: "contracts",
        description: `${contractLabel} de ${clientName} foi ativado e voltou para a operacao ativa.`,
        eventType: "contract_activated",
        href: buildContractHref(contract.id),
        id: `contract-activated:${contract.id}`,
        occurredAt: contract.activated_at,
        severity: "info",
        title: "Contrato ativado",
      }),
    );
  }

  if (contract.completed_at) {
    items.push(
      createTimelineItem({
        area: "contracts",
        description: `${contractLabel} de ${clientName} foi concluido.`,
        eventType: "contract_completed",
        href: buildContractHref(contract.id),
        id: `contract-completed:${contract.id}`,
        occurredAt: contract.completed_at,
        severity: "info",
        title: "Contrato concluido",
      }),
    );
  }

  if (contract.cancelled_at) {
    items.push(
      createTimelineItem({
        area: "contracts",
        description: `${contractLabel} de ${clientName} foi cancelado.`,
        eventType: "contract_cancelled",
        href: buildContractHref(contract.id),
        id: `contract-cancelled:${contract.id}`,
        occurredAt: contract.cancelled_at,
        severity: "attention",
        title: "Contrato cancelado",
      }),
    );
  }

  if (contract.rejected_at) {
    items.push(
      createTimelineItem({
        area: "contracts",
        description: `${contractLabel} de ${clientName} foi rejeitado.`,
        eventType: "contract_rejected",
        href: buildContractHref(contract.id),
        id: `contract-rejected:${contract.id}`,
        occurredAt: contract.rejected_at,
        severity: "critical",
        title: "Contrato rejeitado",
      }),
    );
  }

  for (const historyEvent of readOperationalHistory(contract.metadata)) {
    if (!historyEvent.occurredAt) {
      continue;
    }

    if (historyEvent.type === "contract_inactivated") {
      items.push(
        createTimelineItem({
          area: "contracts",
          description: [
            `${contractLabel} de ${clientName} foi inativado e os futuros pendentes sairam da operacao.`,
            historyEvent.notes ? `Observacao: ${historyEvent.notes}.` : null,
          ]
            .filter(Boolean)
            .join(" "),
          eventType: "contract_inactivated",
          href: buildContractHref(contract.id),
          id: `contract-inactivated:${contract.id}:${historyEvent.occurredAt}`,
          occurredAt: historyEvent.occurredAt,
          severity: "attention",
          title: "Contrato inativado",
        }),
      );
    }

    if (historyEvent.type === "contract_reactivated") {
      items.push(
        createTimelineItem({
          area: "contracts",
          description: [
            `${contractLabel} de ${clientName} foi reativado e voltou para o fluxo futuro da operacao.`,
            historyEvent.notes ? `Observacao: ${historyEvent.notes}.` : null,
          ]
            .filter(Boolean)
            .join(" "),
          eventType: "contract_reactivated",
          href: buildContractHref(contract.id),
          id: `contract-reactivated:${contract.id}:${historyEvent.occurredAt}`,
          occurredAt: historyEvent.occurredAt,
          severity: "info",
          title: "Contrato reativado",
        }),
      );
    }
  }

  return items;
}

function buildRecognizedRevenueActivityItems(
  entry: RecognizedRevenueEntryRow,
  contractsById: Map<string, ContractRow>,
  clientsById: Map<string, string>,
) {
  if (!entry.contract_id || !entry.recognized_at) {
    return [];
  }

  const contract = contractsById.get(entry.contract_id);
  const clientName =
    contract?.client_id
      ? clientsById.get(contract.client_id) ?? "Cliente nao encontrado"
      : "Cliente nao vinculado";
  const contractLabel = resolveContractLabel(contract?.contract_number ?? null);

  return [
    createTimelineItem({
      area: "revenue",
      description: `${formatCurrency(normalizeNumber(entry.recognized_amount) ?? 0)} foi reconhecido para ${clientName} em ${contractLabel}.`,
      eventType: "revenue_recognized",
      href: buildRevenueHref(entry.contract_id, entry.expected_revenue_entry_id),
      id: `revenue-recognized:${entry.id}`,
      occurredAt: entry.recognized_at,
      severity: "info",
      title: "Receita reconhecida",
    }),
  ];
}

function createTimelineItem(input: {
  area: OperationsTimelineItem["area"];
  description: string;
  eventType: OperationsTimelineEventType;
  href?: string;
  id: string;
  occurredAt: string;
  severity: OperationsTimelineSeverity;
  title: string;
}) {
  return {
    area: input.area,
    description: input.description,
    eventType: input.eventType,
    href: input.href,
    id: input.id,
    occurredAt: input.occurredAt,
    severity: input.severity,
    title: input.title,
  } satisfies OperationsTimelineItem;
}

function resolveContractLabel(contractNumber: string | null) {
  const normalizedContractNumber = normalizeNullableText(contractNumber);

  if (!normalizedContractNumber) {
    return "contrato sem numero";
  }

  return `contrato ${normalizedContractNumber}`;
}

function readOperationalHistory(metadata: unknown) {
  if (!isRecord(metadata)) {
    return [] as ContractHistoryEvent[];
  }

  const operationalHistory = Array.isArray(metadata.operationalHistory)
    ? metadata.operationalHistory.filter(isRecord)
    : [];

  return operationalHistory.map((event) => ({
    action: normalizeNullableText(event.action),
    fromStatus: normalizeNullableText(event.fromStatus),
    notes: normalizeNullableText(event.notes),
    occurredAt: normalizeNullableText(event.occurredAt),
    toStatus: normalizeNullableText(event.toStatus),
    type: normalizeNullableText(event.type),
  }));
}

function buildContractHref(contractId: string) {
  return `/operations/contracts/${encodeURIComponent(contractId)}?origem=atividade`;
}

function buildRevenueHref(contractId: string, entryId: string | null) {
  const params = new URLSearchParams({
    contractId,
    origem: "atividade",
  });

  if (entryId) {
    params.set("entryId", entryId);
  }

  return `/operations/revenue?${params.toString()}`;
}

function createServerOperationsTimelineSupabaseClient(accessToken: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !publishableKey) {
    throw new Error(
      "Supabase operations timeline server environment is not configured.",
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

async function resolveOperationsTimelineRequestContext(accessToken: string | null) {
  if (!accessToken) {
    return {
      error: "Sessao invalida.",
      ok: false as const,
      status: 401,
    };
  }

  try {
    const supabase = createServerOperationsTimelineSupabaseClient(accessToken);
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
      .maybeSingle<OperationsTimelineProfile>();

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
  profile: OperationsTimelineProfile | null,
): profile is OperationsTimelineProfile & {
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

function normalizeText(value: unknown) {
  return normalizeNullableText(value) ?? "";
}

function normalizeNullableText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed || null;
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

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

function isValidDate(value: string) {
  return !Number.isNaN(new Date(value).getTime());
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
