import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  buildContractBidOfferFileName,
  buildContractBidOfferStoragePath,
} from "./contract-bid-offer-calculations";
import { generateContractBidOfferPdf } from "./contract-bid-offer-pdf";
import {
  contractBidOfferStatuses,
  type ContractBidOffer,
  type ContractBidOfferChannel,
  type ContractBidOfferStatus,
  type SaveContractBidOfferInput,
} from "./contract-bid-offer-types";

type Context = {
  organizationId: string;
  profileName: string;
  supabase: SupabaseClient;
};
type Result<T> = ({ ok: true } & T) | { error: string; ok: false; status: number };
type OfferRow = Record<string, unknown>;

const columns =
  "id,organization_id,contract_id,assembly_id,bid_id,client_id,status,version,cash_amount,embedded_amount,total_amount,cash_percentage,embedded_percentage,total_percentage,credit_base_amount,estimated_net_credit,pdf_storage_path,generated_at,sent_at,sent_channel,approved_at,rejected_at,notes,created_at";

export async function listContractBidOffers(
  token: string | null,
  contractId: string,
): Promise<Result<{ offers: ContractBidOffer[] }>> {
  const context = await resolve(token);
  if (!context.ok) return context;
  const { data, error } = await context.supabase
    .from("contract_bid_offers")
    .select(columns)
    .eq("organization_id", context.organizationId)
    .eq("contract_id", contractId)
    .order("version", { ascending: false });
  if (error) return fail("Nao foi possivel carregar as ofertas de lance.", error);
  return enrichOffers(context, (data ?? []) as OfferRow[]);
}

export async function saveContractBidOffer(
  token: string | null,
  contractId: string,
  input: SaveContractBidOfferInput,
): Promise<Result<{ offer: ContractBidOffer }>> {
  if (
    !input.id ||
    !input.assemblyId ||
    input.cashAmount < 0 ||
    input.embeddedAmount < 0 ||
    input.cashAmount + input.embeddedAmount <= 0
  ) {
    return { error: "Revise os valores da oferta.", ok: false, status: 400 };
  }
  const context = await resolve(token);
  if (!context.ok) return context;
  const { data, error } = await context.supabase.rpc("save_contract_bid_offer", {
    p_assembly_id: input.assemblyId,
    p_bid_id: input.bidId ?? null,
    p_cash_amount: input.cashAmount,
    p_contract_id: contractId,
    p_embedded_amount: input.embeddedAmount,
    p_id: input.id,
    p_notes: input.notes?.trim() || null,
  });
  if (error) return mapWrite(error);
  const enriched = await enrichOffers(context, [data as OfferRow]);
  return enriched.ok
    ? { offer: enriched.offers[0]!, ok: true }
    : enriched;
}

export async function generateContractBidOffer(
  token: string | null,
  contractId: string,
  offerId: string,
): Promise<Result<{ offer: ContractBidOffer }>> {
  const context = await resolve(token);
  if (!context.ok) return context;
  const loaded = await loadOffer(context, contractId, offerId);
  if (!loaded.ok) return loaded;
  if (loaded.row.status !== "draft") {
    return { error: "Somente rascunhos podem gerar PDF.", ok: false, status: 400 };
  }
  const enriched = await enrichOffers(context, [loaded.row]);
  if (!enriched.ok) return enriched;
  const offer = enriched.offers[0]!;
  const bid = await loadBid(context, offer.bidId);
  if (!bid.ok) return bid;
  const fileName = buildContractBidOfferFileName({
    assemblyLabel: offer.assemblyDate.slice(0, 10),
    clientName: offer.clientName,
    version: offer.version,
  });
  const path = buildContractBidOfferStoragePath({
    assemblyId: offer.assemblyId,
    contractId,
    fileName,
    offerId,
    organizationId: context.organizationId,
    version: offer.version,
  });
  const pdf = generateContractBidOfferPdf({
    ...offer,
    bidComposition: bid.bidComposition,
    bidModality: bid.bidModality,
    consultantName: context.profileName,
  });
  const upload = await context.supabase.storage
    .from("contract-bid-offers")
    .upload(path, pdf, { contentType: "application/pdf", upsert: false });
  if (upload.error) return fail("Nao foi possivel armazenar o PDF.", upload.error);
  const marked = await context.supabase.rpc("mark_contract_bid_offer_generated", {
    p_offer_id: offerId,
    p_storage_path: path,
  });
  if (marked.error) {
    await context.supabase.storage.from("contract-bid-offers").remove([path]);
    return mapWrite(marked.error);
  }
  const result = await enrichOffers(context, [marked.data as OfferRow]);
  return result.ok ? { offer: result.offers[0]!, ok: true } : result;
}

export async function createContractBidOfferAccess(
  token: string | null,
  contractId: string,
  offerId: string,
  download: boolean,
): Promise<Result<{ fileName: string; url: string }>> {
  const context = await resolve(token);
  if (!context.ok) return context;
  const loaded = await loadOffer(context, contractId, offerId);
  if (!loaded.ok) return loaded;
  const path = string(loaded.row.pdf_storage_path);
  if (!path) return { error: "PDF ainda nao gerado.", ok: false, status: 400 };
  const fileName = path.split("/").at(-1) ?? "estrategia-lance.pdf";
  const { data, error } = await context.supabase.storage
    .from("contract-bid-offers")
    .createSignedUrl(path, 300, download ? { download: fileName } : undefined);
  if (error || !data?.signedUrl) return fail("Nao foi possivel acessar o PDF.", error);
  return { fileName, ok: true, url: data.signedUrl };
}

export async function transitionContractBidOffer(
  token: string | null,
  contractId: string,
  offerId: string,
  status: ContractBidOfferStatus,
  channel?: ContractBidOfferChannel,
): Promise<Result<{ offer: ContractBidOffer }>> {
  if (!contractBidOfferStatuses.includes(status)) {
    return { error: "Status da oferta invalido.", ok: false, status: 400 };
  }
  const context = await resolve(token);
  if (!context.ok) return context;
  const loaded = await loadOffer(context, contractId, offerId);
  if (!loaded.ok) return loaded;
  const { data, error } = await context.supabase.rpc(
    "transition_contract_bid_offer",
    { p_channel: channel ?? null, p_offer_id: offerId, p_status: status },
  );
  if (error) return mapWrite(error);
  const enriched = await enrichOffers(context, [data as OfferRow]);
  return enriched.ok
    ? { offer: enriched.offers[0]!, ok: true }
    : enriched;
}

async function enrichOffers(
  context: Context,
  rows: OfferRow[],
): Promise<Result<{ offers: ContractBidOffer[] }>> {
  if (!rows.length) return { offers: [], ok: true };
  const contractIds = unique(rows.map((row) => string(row.contract_id)));
  const assemblyIds = unique(rows.map((row) => string(row.assembly_id)));
  const clientIds = unique(rows.map((row) => string(row.client_id)).filter(Boolean));
  const [contracts, assemblies, clients, administrators] = await Promise.all([
    context.supabase.from("contracts").select("id,contract_number,contract_group,contract_quota,administrator_id").in("id", contractIds),
    context.supabase.from("contract_assemblies").select("id,assembly_date").in("id", assemblyIds),
    clientIds.length
      ? context.supabase.from("clients").select("id,name,email,phone").in("id", clientIds)
      : Promise.resolve({ data: [], error: null }),
    context.supabase.from("administrators").select("id,name"),
  ]);
  const error = contracts.error ?? assemblies.error ?? clients.error ?? administrators.error;
  if (error) return fail("Nao foi possivel completar os dados das ofertas.", error);
  const byId = (items: unknown[]) =>
    new Map((items as OfferRow[]).map((item) => [string(item.id), item]));
  const contractMap = byId(contracts.data ?? []);
  const assemblyMap = byId(assemblies.data ?? []);
  const clientMap = byId(clients.data ?? []);
  const administratorMap = byId(administrators.data ?? []);
  return {
    ok: true,
    offers: rows.map((row) => {
      const contract = contractMap.get(string(row.contract_id)) ?? {};
      const assembly = assemblyMap.get(string(row.assembly_id)) ?? {};
      const client = clientMap.get(string(row.client_id)) ?? {};
      const administrator =
        administratorMap.get(string(contract.administrator_id)) ?? {};
      return map(row, contract, assembly, client, administrator);
    }),
  };
}

async function loadOffer(context: Context, contractId: string, offerId: string) {
  const { data, error } = await context.supabase
    .from("contract_bid_offers")
    .select(columns)
    .eq("organization_id", context.organizationId)
    .eq("contract_id", contractId)
    .eq("id", offerId)
    .maybeSingle();
  if (error) return fail("Nao foi possivel carregar a oferta.", error);
  return data
    ? { ok: true as const, row: data as OfferRow }
    : { error: "Oferta nao encontrada.", ok: false as const, status: 404 };
}

async function loadBid(context: Context, bidId?: string) {
  if (!bidId) return { bidComposition: "nao informado", bidModality: "nao informada", ok: true as const };
  const { data, error } = await context.supabase
    .from("contract_bids")
    .select("bid_composition,bid_modality")
    .eq("id", bidId)
    .maybeSingle();
  if (error || !data) return fail("Estrategia de lance nao encontrada.", error);
  return {
    bidComposition: string(data.bid_composition),
    bidModality: string(data.bid_modality),
    ok: true as const,
  };
}

async function resolve(token: string | null): Promise<Result<Context>> {
  if (!token) return { error: "Sessao expirada.", ok: false, status: 401 };
  try {
    const supabase = client(token);
    const user = await supabase.auth.getUser(token);
    if (user.error || !user.data.user)
      return { error: "Sessao expirada.", ok: false, status: 401 };
    const profile = await supabase
      .from("profiles")
      .select("organization_id,role,is_active,name")
      .eq("id", user.data.user.id)
      .maybeSingle();
    if (
      profile.error ||
      !profile.data?.organization_id ||
      profile.data.is_active !== true ||
      !["admin", "master", "sdr"].includes(profile.data.role)
    )
      return { error: "Perfil nao autorizado.", ok: false, status: 403 };
    return {
      ok: true,
      organizationId: profile.data.organization_id,
      profileName: profile.data.name?.trim() || "Consultor EVOLV",
      supabase,
    };
  } catch (error) {
    return fail("Nao foi possivel validar a sessao.", error);
  }
}

function client(token: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase environment is not configured.");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

function map(
  row: OfferRow,
  contract: OfferRow,
  assembly: OfferRow,
  clientRow: OfferRow,
  administrator: OfferRow,
): ContractBidOffer {
  const contractNumber = string(contract.contract_number);
  return {
    administratorName: string(administrator.name) || "Administradora nao vinculada",
    approvedAt: optional(row.approved_at),
    assemblyDate: string(assembly.assembly_date),
    assemblyId: string(row.assembly_id),
    bidId: optional(row.bid_id),
    cashAmount: number(row.cash_amount),
    cashPercentage: optionalNumber(row.cash_percentage),
    clientEmail: optional(clientRow.email),
    clientId: optional(row.client_id),
    clientName: string(clientRow.name) || "Cliente nao vinculado",
    clientPhone: optional(clientRow.phone),
    contractId: string(row.contract_id),
    contractName: contractNumber ? `Contrato ${contractNumber}` : "Contrato sem numero",
    createdAt: string(row.created_at),
    creditBaseAmount: number(row.credit_base_amount),
    embeddedAmount: number(row.embedded_amount),
    embeddedPercentage: optionalNumber(row.embedded_percentage),
    estimatedNetCredit: optionalNumber(row.estimated_net_credit),
    generatedAt: optional(row.generated_at),
    groupNumber: optional(contract.contract_group),
    id: string(row.id),
    notes: optional(row.notes),
    quotaNumber: optional(contract.contract_quota),
    rejectedAt: optional(row.rejected_at),
    sentAt: optional(row.sent_at),
    sentChannel: optional(row.sent_channel) as ContractBidOfferChannel | undefined,
    status: row.status as ContractBidOfferStatus,
    totalAmount: number(row.total_amount),
    totalPercentage: optionalNumber(row.total_percentage),
    version: number(row.version),
  };
}

function mapWrite(error: unknown) {
  const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
  if (process.env.NODE_ENV !== "production") console.error("[OPP-002]", error);
  if (code === "42501") return { error: "Sem permissao para operar esta oferta.", ok: false as const, status: 403 };
  if (["22023", "23505", "23514"].includes(code))
    return { error: "A operacao nao e compativel com o estado da oferta.", ok: false as const, status: 400 };
  return { error: "Nao foi possivel salvar a oferta.", ok: false as const, status: 500 };
}

function fail(message: string, error: unknown) {
  if (process.env.NODE_ENV !== "production") console.error("[OPP-002]", error);
  return { error: message, ok: false as const, status: 500 };
}
function string(value: unknown) { return typeof value === "string" ? value : ""; }
function optional(value: unknown) { const valueString = string(value); return valueString || undefined; }
function number(value: unknown) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : 0; }
function optionalNumber(value: unknown) { return value === null || value === undefined ? undefined : number(value); }
function unique(values: string[]) { return [...new Set(values.filter(Boolean))]; }
