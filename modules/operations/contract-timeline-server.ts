import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  ContractAssembly,
  ContractBid,
  ContractOperationalTimeline,
  ContractTimelineEvent,
  RegisterAssemblyInput,
  RegisterBidInput,
  RegisterBidResultInput,
} from "./contract-timeline-types";
import { isValidBidComposition } from "./contract-timeline-calculations";

type ProfileRow = {
  id: string;
  is_active: boolean | null;
  organization_id: string | null;
  role: string | null;
};

type RequestContext = {
  organizationId: string;
  supabase: SupabaseClient;
};

type Result<T> =
  | ({ ok: true } & T)
  | { error: string; ok: false; status: number };

const accessError =
  "Você não tem permissão para operar contratos nesta organização.";

export async function listContractOperationalTimeline(
  accessToken: string | null,
  contractId: string,
): Promise<Result<{ timeline: ContractOperationalTimeline }>> {
  const context = await resolveContext(accessToken);
  if (!context.ok) return context;

  const contractExists = await findContract(context, contractId);
  if (!contractExists.ok) return contractExists;

  const [assembliesResult, bidsResult, eventsResult] = await Promise.all([
    context.supabase
      .from("contract_assemblies")
      .select("id,contract_id,assembly_date,assembly_number,status,notes")
      .eq("organization_id", context.organizationId)
      .eq("contract_id", contractId)
      .order("assembly_date", { ascending: false }),
    context.supabase
      .from("contract_bids")
      .select(
        "id,contract_id,assembly_id,bid_modality,bid_composition,credit_base_amount,cash_amount,embedded_amount,total_amount,cash_percentage,embedded_percentage,total_percentage,submitted_at,result,contemplated,contemplation_type,winning_percentage,notes",
      )
      .eq("organization_id", context.organizationId)
      .eq("contract_id", contractId)
      .order("created_at", { ascending: false }),
    context.supabase
      .from("contract_timeline_events")
      .select(
        "id,event_type,event_at,title,description,source_entity_type,source_entity_id,metadata",
      )
      .eq("organization_id", context.organizationId)
      .eq("contract_id", contractId)
      .order("event_at", { ascending: false }),
  ]);

  const error = assembliesResult.error ?? bidsResult.error ?? eventsResult.error;
  if (error) {
    logTechnicalError("listContractOperationalTimeline", error);
    return {
      error: "Não foi possível carregar a Timeline Operacional.",
      ok: false,
      status: 500,
    };
  }

  return {
    ok: true,
    timeline: {
      assemblies: (assembliesResult.data ?? []).map(mapAssembly),
      bids: (bidsResult.data ?? []).map(mapBid),
      events: (eventsResult.data ?? []).map(mapEvent),
    },
  };
}

export async function registerContractAssembly(
  accessToken: string | null,
  contractId: string,
  input: RegisterAssemblyInput,
): Promise<Result<{ timeline: ContractOperationalTimeline }>> {
  const validation = validateAssembly(input);
  if (validation) return validation;
  const context = await resolveContext(accessToken);
  if (!context.ok) return context;

  const { error } = await context.supabase.rpc("register_contract_assembly", {
    p_assembly_date: input.assemblyDate,
    p_assembly_number: normalizeText(input.assemblyNumber),
    p_contract_id: contractId,
    p_id: input.id,
    p_notes: normalizeText(input.notes),
    p_status: input.status,
  });
  if (error) return mapWriteError("registerContractAssembly", error);
  return listContractOperationalTimeline(accessToken, contractId);
}

export async function registerContractBid(
  accessToken: string | null,
  contractId: string,
  input: RegisterBidInput,
): Promise<Result<{ timeline: ContractOperationalTimeline }>> {
  const validation = validateBid(input);
  if (validation) return validation;
  const context = await resolveContext(accessToken);
  if (!context.ok) return context;

  const { error } = await context.supabase.rpc("register_contract_bid", {
    p_assembly_id: input.assemblyId,
    p_bid_composition: input.bidComposition,
    p_bid_modality: input.bidModality,
    p_cash_amount: input.cashAmount,
    p_contract_id: contractId,
    p_embedded_amount: input.embeddedAmount,
    p_id: input.id,
    p_notes: normalizeText(input.notes),
    p_result: input.result,
    p_submitted_at: input.submittedAt || null,
  });
  if (error) return mapWriteError("registerContractBid", error);
  return listContractOperationalTimeline(accessToken, contractId);
}

export async function registerContractBidResult(
  accessToken: string | null,
  contractId: string,
  bidId: string,
  input: RegisterBidResultInput,
): Promise<Result<{ timeline: ContractOperationalTimeline }>> {
  const validation = validateBidResult(input);
  if (validation) return validation;
  const context = await resolveContext(accessToken);
  if (!context.ok) return context;

  const { error } = await context.supabase.rpc("register_contract_bid_result", {
    p_bid_id: bidId,
    p_contemplated: input.contemplated,
    p_contemplation_type: input.contemplated
      ? input.contemplationType
      : null,
    p_notes: normalizeText(input.notes),
    p_winning_percentage: input.winningPercentage ?? null,
  });
  if (error) return mapWriteError("registerContractBidResult", error);
  return listContractOperationalTimeline(accessToken, contractId);
}

async function resolveContext(
  accessToken: string | null,
): Promise<Result<RequestContext>> {
  if (!accessToken) {
    return {
      error: "Sua sessão expirou. Entre novamente para continuar.",
      ok: false,
      status: 401,
    };
  }

  try {
    const supabase = createServerClient(accessToken);
    const { data: userData, error: userError } =
      await supabase.auth.getUser(accessToken);
    if (userError || !userData.user) {
      logTechnicalError("resolveContractTimelineUser", userError);
      return {
        error: "Sua sessão expirou. Entre novamente para continuar.",
        ok: false,
        status: 401,
      };
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("id,organization_id,role,is_active")
      .eq("id", userData.user.id)
      .maybeSingle<ProfileRow>();
    if (error) {
      logTechnicalError("resolveContractTimelineProfile", error);
      return {
        error: "Não foi possível consultar o perfil autenticado.",
        ok: false,
        status: 500,
      };
    }
    if (!data) {
      return {
        error: "Não existe perfil vinculado à sua conta.",
        ok: false,
        status: 403,
      };
    }
    if (data.is_active !== true) {
      return { error: "Seu perfil está inativo.", ok: false, status: 403 };
    }
    if (!data.organization_id) {
      return {
        error: "Seu perfil não possui uma organização vinculada.",
        ok: false,
        status: 403,
      };
    }
    if (!isSupportedRole(data.role)) {
      return { error: accessError, ok: false, status: 403 };
    }

    return { ok: true, organizationId: data.organization_id, supabase };
  } catch (error) {
    logTechnicalError("resolveContractTimelineContext", error);
    return {
      error: "Não foi possível validar a sessão.",
      ok: false,
      status: 500,
    };
  }
}

async function findContract(context: RequestContext, contractId: string) {
  const { data, error } = await context.supabase
    .from("contracts")
    .select("id")
    .eq("id", contractId)
    .eq("organization_id", context.organizationId)
    .maybeSingle();
  if (error) {
    logTechnicalError("findContract", error);
    return {
      error: "Não foi possível validar o contrato.",
      ok: false as const,
      status: 500,
    };
  }
  if (!data) {
    return {
      error: "O contrato não está disponível na sua organização.",
      ok: false as const,
      status: 404,
    };
  }
  return { ok: true as const };
}

function createServerClient(accessToken: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase environment is not configured.");
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

function validateAssembly(input: RegisterAssemblyInput) {
  if (!input.id || !isValidDate(input.assemblyDate)) {
    return {
      error: "Informe uma data válida para a assembleia.",
      ok: false as const,
      status: 400,
    };
  }
  return null;
}

function validateBid(input: RegisterBidInput) {
  if (!input.id || !input.assemblyId) {
    return {
      error: "Selecione a assembleia do lance.",
      ok: false as const,
      status: 400,
    };
  }
  if (input.cashAmount < 0 || input.embeddedAmount < 0) {
    return {
      error: "Os valores do lance não podem ser negativos.",
      ok: false as const,
      status: 400,
    };
  }
  if (
    !isValidBidComposition({
      cashAmount: input.cashAmount,
      composition: input.bidComposition,
      embeddedAmount: input.embeddedAmount,
    })
  ) {
    return {
      error: "Os valores não correspondem à composição selecionada.",
      ok: false as const,
      status: 400,
    };
  }
  return null;
}

function validateBidResult(input: RegisterBidResultInput) {
  if (input.contemplated && !input.contemplationType) {
    return {
      error: "Informe o tipo de contemplação.",
      ok: false as const,
      status: 400,
    };
  }
  if (
    input.winningPercentage !== undefined &&
    input.winningPercentage < 0
  ) {
    return {
      error: "O percentual vencedor não pode ser negativo.",
      ok: false as const,
      status: 400,
    };
  }
  return null;
}

function mapWriteError(operation: string, error: unknown) {
  logTechnicalError(operation, error);
  const code = readErrorCode(error);
  const message = readErrorMessage(error);
  if (code === "42501") {
    return {
      error: message.includes("contract_timeline_events")
        ? "A Timeline não está autorizada para concluir esta gravação."
        : "Você não tem permissão para operar este contrato.",
      ok: false as const,
      status: 403,
    };
  }
  if (code === "PGRST202" || code === "42883") {
    return {
      error: "A operação da Timeline ainda não está disponível.",
      ok: false as const,
      status: 503,
    };
  }
  if (code === "42P01" || code === "42703") {
    return {
      error: "A estrutura da Timeline precisa ser atualizada.",
      ok: false as const,
      status: 503,
    };
  }
  if (code === "23503" || code === "P0002") {
    return {
      error: "O contrato ou a assembleia informada não está disponível.",
      ok: false as const,
      status: 400,
    };
  }
  if (
    code === "22023" ||
    code === "23502" ||
    code === "23505" ||
    code === "23514" ||
    code === "22P02"
  ) {
    return {
      error: "Revise os dados informados para concluir o registro.",
      ok: false as const,
      status: 400,
    };
  }
  return {
    error: "Não foi possível salvar o registro operacional.",
    ok: false as const,
    status: 500,
  };
}

function mapAssembly(row: Record<string, unknown>): ContractAssembly {
  return {
    assemblyDate: String(row.assembly_date),
    assemblyNumber: optionalString(row.assembly_number),
    contractId: String(row.contract_id),
    id: String(row.id),
    notes: optionalString(row.notes),
    status: row.status as ContractAssembly["status"],
  };
}

function mapBid(row: Record<string, unknown>): ContractBid {
  return {
    assemblyId: String(row.assembly_id),
    bidComposition: row.bid_composition as ContractBid["bidComposition"],
    bidModality: row.bid_modality as ContractBid["bidModality"],
    cashAmount: numberValue(row.cash_amount),
    cashPercentage: optionalNumber(row.cash_percentage),
    contemplated:
      typeof row.contemplated === "boolean" ? row.contemplated : undefined,
    contemplationType:
      (optionalString(row.contemplation_type) as
        | ContractBid["contemplationType"]
        | undefined),
    contractId: String(row.contract_id),
    creditBaseAmount: numberValue(row.credit_base_amount),
    embeddedAmount: numberValue(row.embedded_amount),
    embeddedPercentage: optionalNumber(row.embedded_percentage),
    id: String(row.id),
    notes: optionalString(row.notes),
    result: row.result as ContractBid["result"],
    submittedAt: optionalString(row.submitted_at),
    totalAmount: numberValue(row.total_amount),
    totalPercentage: optionalNumber(row.total_percentage),
    winningPercentage: optionalNumber(row.winning_percentage),
  };
}

function mapEvent(row: Record<string, unknown>): ContractTimelineEvent {
  return {
    description: optionalString(row.description),
    eventAt: String(row.event_at),
    eventType: row.event_type as ContractTimelineEvent["eventType"],
    id: String(row.id),
    metadata: isRecord(row.metadata) ? row.metadata : {},
    sourceEntityId: optionalString(row.source_entity_id),
    sourceEntityType:
      (optionalString(row.source_entity_type) as
        | ContractTimelineEvent["sourceEntityType"]
        | undefined),
    title: String(row.title),
  };
}

function isSupportedRole(role: string | null) {
  return ["admin", "master", "sdr"].includes(role ?? "");
}

function isValidDate(value: string) {
  return Boolean(value && !Number.isNaN(new Date(value).getTime()));
}
function normalizeText(value?: string) {
  return value?.trim() || null;
}
function optionalString(value: unknown) {
  return typeof value === "string" && value ? value : undefined;
}
function numberValue(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
function optionalNumber(value: unknown) {
  if (value === null || value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}
function readErrorCode(value: unknown) {
  return isRecord(value) && typeof value.code === "string" ? value.code : null;
}
function readErrorMessage(value: unknown) {
  return isRecord(value) && typeof value.message === "string"
    ? value.message
    : "";
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
function logTechnicalError(operation: string, error: unknown) {
  if (process.env.NODE_ENV !== "production") {
    console.error(`[ERA-VI-001] ${operation}`, error);
  }
}
