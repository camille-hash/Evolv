import { createClient } from "@supabase/supabase-js";
import type {
  CrmLead,
  CrmOpportunityStatus,
  CrmTemperature,
} from "../crm-types";
import type { CrmRepository } from "./crm-repository";

type SupabaseCrmLeadRow = {
  id: string;
  external_id: string | null;
  nome: string | null;
  telefone: string | null;
  email: string | null;
  pais: string | null;
  origem: string | null;
  consultor: string | null;
  valor_pretendido: number | string | null;
  observacoes: string | null;
  pipeline: string | null;
  etapa: string | null;
  tags: string[] | null;
  produto_interesse: string | null;
  temperatura: string | null;
  status: string | null;
  proxima_acao: string | null;
  data_proxima_acao: string | null;
  closed_at: string | null;
  titulo_oportunidade: string | null;
  created_at: string | null;
  updated_at: string | null;
};

const crmLeadColumns = [
  "id",
  "external_id",
  "nome",
  "telefone",
  "email",
  "pais",
  "origem",
  "consultor",
  "valor_pretendido",
  "observacoes",
  "pipeline",
  "etapa",
  "tags",
  "produto_interesse",
  "temperatura",
  "status",
  "proxima_acao",
  "data_proxima_acao",
  "closed_at",
  "titulo_oportunidade",
  "created_at",
  "updated_at",
].join(",");

export class SupabaseCrmRepository implements CrmRepository {
  private readonly supabase = createClient(
    this.supabaseUrl,
    this.publishableKey,
    {
      auth: {
        persistSession: false,
      },
    },
  );

  constructor(
    private readonly supabaseUrl: string,
    private readonly publishableKey: string,
  ) {}

  async list(): Promise<CrmLead[]> {
    const { data, error } = await this.supabase
      .from("crm_leads")
      .select(crmLeadColumns)
      .order("updated_at", { ascending: false });

    if (error) {
      throw error;
    }

    const rows = (data ?? []) as unknown as SupabaseCrmLeadRow[];

    return rows.map(mapSupabaseCrmLead);
  }

  async getById(id: string): Promise<CrmLead | null> {
    const { data, error } = await this.supabase
      .from("crm_leads")
      .select(crmLeadColumns)
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data ? mapSupabaseCrmLead(data as unknown as SupabaseCrmLeadRow) : null;
  }
}

export function canUseSupabaseCrmRepository() {
  return (
    process.env.NEXT_PUBLIC_USE_SUPABASE_CRM === "true" &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
  );
}

export function createSupabaseCrmRepository() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !publishableKey) {
    throw new Error("Supabase CRM public environment variables are not configured.");
  }

  return new SupabaseCrmRepository(supabaseUrl, publishableKey);
}

function mapSupabaseCrmLead(row: SupabaseCrmLeadRow): CrmLead {
  const now = new Date().toISOString();

  return {
    id: row.id,
    externalId: row.external_id ?? undefined,
    closedAt: row.closed_at ?? undefined,
    tituloOportunidade: row.titulo_oportunidade ?? undefined,
    nome: row.nome ?? "",
    telefone: row.telefone ?? "",
    email: row.email ?? "",
    pais: row.pais ?? "",
    origem: row.origem ?? "",
    consultor: row.consultor ?? "",
    valorPretendido: normalizeNumber(row.valor_pretendido),
    observacoes: row.observacoes ?? "",
    pipeline: row.pipeline ?? "",
    etapa: row.etapa ?? "",
    tags: row.tags ?? [],
    produtoInteresse: row.produto_interesse ?? "",
    temperatura: normalizeTemperature(row.temperatura),
    status: normalizeStatus(row.status),
    proximaAcao: row.proxima_acao ?? "",
    dataProximaAcao: row.data_proxima_acao ?? "",
    createdAt: row.created_at ?? now,
    updatedAt: row.updated_at ?? row.created_at ?? now,
  };
}

function normalizeNumber(value: number | string | null) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsedValue = Number(value);

    return Number.isFinite(parsedValue) ? parsedValue : 0;
  }

  return 0;
}

function normalizeTemperature(value: string | null): CrmTemperature {
  return value === "fria" || value === "quente" ? value : "morna";
}

function normalizeStatus(value: string | null): CrmOpportunityStatus {
  return value === "ganha" || value === "perdida" ? value : "ativa";
}
