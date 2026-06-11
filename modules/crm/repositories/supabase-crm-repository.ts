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

  async updateLead(
    id: string,
    patch: Partial<CrmLead>,
  ): Promise<CrmLead | null> {
    const updatePayload = mapCrmLeadPatchToSupabaseRow(patch);
    const fields = Object.keys(updatePayload);

    console.info("[EVOLV CRM] Supabase update solicitado", {
      fields,
      id,
      lookup: "id",
    });

    const { data, error } = await this.supabase
      .from("crm_leads")
      .update(updatePayload)
      .eq("id", id)
      .select(crmLeadColumns)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (data) {
      console.info("[EVOLV CRM] Supabase update confirmado", {
        id,
        lookup: "id",
      });

      return mapSupabaseCrmLead(data as unknown as SupabaseCrmLeadRow);
    }

    if (patch.externalId) {
      console.info(
        "[EVOLV CRM] Nenhum lead atualizado por id. Tentando external_id.",
        {
          externalId: patch.externalId,
          id,
        },
      );

      const { data: externalIdData, error: externalIdError } =
        await this.supabase
          .from("crm_leads")
          .update(updatePayload)
          .eq("external_id", patch.externalId)
          .select(crmLeadColumns)
          .maybeSingle();

      if (externalIdError) {
        throw externalIdError;
      }

      if (externalIdData) {
        console.info("[EVOLV CRM] Supabase update confirmado", {
          externalId: patch.externalId,
          id,
          lookup: "external_id",
        });

        return mapSupabaseCrmLead(
          externalIdData as unknown as SupabaseCrmLeadRow,
        );
      }
    }

    console.warn("[EVOLV CRM] Supabase update nao encontrou o lead.", {
      externalId: patch.externalId,
      id,
    });

    return null;
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

function mapCrmLeadPatchToSupabaseRow(patch: Partial<CrmLead>) {
  const row: Record<string, unknown> = {
    updated_at: patch.updatedAt ?? new Date().toISOString(),
  };

  setIfPresent(row, "external_id", patch.externalId);
  setIfPresent(row, "closed_at", patch.closedAt);
  setIfPresent(row, "titulo_oportunidade", patch.tituloOportunidade);
  setIfPresent(row, "nome", patch.nome);
  setIfPresent(row, "telefone", patch.telefone);
  setIfPresent(row, "email", patch.email);
  setIfPresent(row, "pais", patch.pais);
  setIfPresent(row, "origem", patch.origem);
  setIfPresent(row, "consultor", patch.consultor);
  setIfPresent(row, "valor_pretendido", patch.valorPretendido);
  setIfPresent(row, "observacoes", patch.observacoes);
  setIfPresent(row, "pipeline", patch.pipeline);
  setIfPresent(row, "etapa", patch.etapa);
  setIfPresent(row, "tags", patch.tags);
  setIfPresent(row, "produto_interesse", patch.produtoInteresse);
  setIfPresent(row, "temperatura", patch.temperatura);
  setIfPresent(row, "status", patch.status);
  setIfPresent(row, "proxima_acao", patch.proximaAcao);
  setIfPresent(row, "data_proxima_acao", patch.dataProximaAcao);
  setIfPresent(row, "created_at", patch.createdAt);

  return row;
}

function setIfPresent(
  row: Record<string, unknown>,
  key: string,
  value: unknown,
) {
  if (value !== undefined) {
    row[key] = value;
  }
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
