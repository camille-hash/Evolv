import { createClient } from "@supabase/supabase-js";
import type {
  CrmLead,
  CrmOpportunityStatus,
  CrmTemperature,
} from "../crm-types";
import type { CrmRepository } from "./crm-repository";

type AuthenticatedSupabaseCrmLeadRow = {
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

type DateNormalizationLog = {
  field: string;
  from: unknown;
  to: string | null | undefined;
};

type AuthenticatedCrmProfile = {
  id: string;
  organization_id: string | null;
  is_active: boolean | null;
};

const authenticatedCrmLeadColumns = [
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

const missingSessionMessage =
  "Supabase authenticated CRM session is not available.";

export class AuthenticatedSupabaseCrmRepository implements CrmRepository {
  private readonly supabase = createClient(
    this.supabaseUrl,
    this.publishableKey,
    {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true,
      },
    },
  );

  constructor(
    private readonly supabaseUrl: string,
    private readonly publishableKey: string,
  ) {}

  async createLead(lead: CrmLead): Promise<CrmLead> {
    const session = await this.requireAuthenticatedSession("createLead");
    const { data: profile, error: profileError } = await this.supabase
      .from("profiles")
      .select("id, organization_id, is_active")
      .eq("id", session.user.id)
      .maybeSingle<AuthenticatedCrmProfile>();

    if (profileError || !profile?.organization_id || profile.is_active !== true) {
      throw profileError ?? new Error("Perfil ativo do CRM nao encontrado.");
    }

    const { insertPayload } = mapCrmLeadToAuthenticatedSupabaseInsert(lead);
    const { data, error } = await this.supabase
      .from("crm_leads")
      .insert({
        ...insertPayload,
        organization_id: profile.organization_id,
      })
      .select(authenticatedCrmLeadColumns)
      .single();

    if (error) {
      if (error.code === "23505") {
        const existingLead = await this.getById(lead.id);

        if (existingLead) {
          return existingLead;
        }
      }

      throw error;
    }

    return mapAuthenticatedSupabaseCrmLead(
      data as unknown as AuthenticatedSupabaseCrmLeadRow,
    );
  }

  async list(): Promise<CrmLead[]> {
    await this.requireAuthenticatedSession("list");

    const { data, error } = await this.supabase
      .from("crm_leads")
      .select(authenticatedCrmLeadColumns)
      .order("updated_at", { ascending: false });

    if (error) {
      throw error;
    }

    const rows = (data ?? []) as unknown as AuthenticatedSupabaseCrmLeadRow[];

    console.info("[EVOLV CRM] Authenticated shadow list concluido.", {
      total: rows.length,
    });

    return rows.map(mapAuthenticatedSupabaseCrmLead);
  }

  async getById(id: string): Promise<CrmLead | null> {
    await this.requireAuthenticatedSession("getById");

    const { data, error } = await this.supabase
      .from("crm_leads")
      .select(authenticatedCrmLeadColumns)
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    console.info("[EVOLV CRM] Authenticated shadow getById concluido.", {
      found: Boolean(data),
      id,
    });

    return data
      ? mapAuthenticatedSupabaseCrmLead(
          data as unknown as AuthenticatedSupabaseCrmLeadRow,
        )
      : null;
  }

  async updateLead(
    id: string,
    patch: Partial<CrmLead>,
  ): Promise<CrmLead | null> {
    await this.requireAuthenticatedSession("updateLead");

    const { normalizedDates, updatePayload } =
      mapCrmLeadPatchToAuthenticatedSupabaseRow(patch);
    const fields = Object.keys(updatePayload);

    console.info("[EVOLV CRM] Authenticated shadow update solicitado.", {
      fields,
      id,
      lookup: "id",
    });

    if (normalizedDates.length) {
      console.info(
        "[EVOLV CRM] Authenticated shadow normalizou campos de data.",
        {
          fields: normalizedDates.map((item) => item.field),
        },
      );
    }

    const { data, error } = await this.supabase
      .from("crm_leads")
      .update(updatePayload)
      .eq("id", id)
      .select(authenticatedCrmLeadColumns)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (data) {
      console.info("[EVOLV CRM] Authenticated shadow update confirmado.", {
        id,
        lookup: "id",
      });

      return mapAuthenticatedSupabaseCrmLead(
        data as unknown as AuthenticatedSupabaseCrmLeadRow,
      );
    }

    if (patch.externalId) {
      console.info(
        "[EVOLV CRM] Authenticated shadow nao encontrou por id. Tentando external_id.",
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
          .select(authenticatedCrmLeadColumns)
          .maybeSingle();

      if (externalIdError) {
        throw externalIdError;
      }

      if (externalIdData) {
        console.info("[EVOLV CRM] Authenticated shadow update confirmado.", {
          externalId: patch.externalId,
          id,
          lookup: "external_id",
        });

        return mapAuthenticatedSupabaseCrmLead(
          externalIdData as unknown as AuthenticatedSupabaseCrmLeadRow,
        );
      }
    }

    console.warn("[EVOLV CRM] Authenticated shadow nao encontrou o lead.", {
      externalId: patch.externalId,
      id,
    });

    return null;
  }

  private async requireAuthenticatedSession(operation: string) {
    const { data, error } = await this.supabase.auth.getSession();

    if (error || !data.session?.access_token) {
      console.warn("[EVOLV CRM] Authenticated shadow sem sessao valida.", {
        operation,
      });

      throw new Error(missingSessionMessage);
    }

    console.info("[EVOLV CRM] Authenticated shadow usando sessao Supabase.", {
      operation,
      userId: data.session.user.id,
    });

    return data.session;
  }
}

export function canCreateAuthenticatedSupabaseCrmRepository() {
  return (
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    )
  );
}

export function createAuthenticatedSupabaseCrmRepository() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !publishableKey) {
    throw new Error(
      "Supabase authenticated CRM public environment variables are not configured.",
    );
  }

  return new AuthenticatedSupabaseCrmRepository(supabaseUrl, publishableKey);
}

function mapAuthenticatedSupabaseCrmLead(
  row: AuthenticatedSupabaseCrmLeadRow,
): CrmLead {
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

function mapCrmLeadPatchToAuthenticatedSupabaseRow(patch: Partial<CrmLead>) {
  const normalizedDates: DateNormalizationLog[] = [];
  const row: Record<string, unknown> = {
    updated_at: normalizeTimestampValue(
      "updated_at",
      patch.updatedAt ?? new Date(),
      normalizedDates,
    ),
  };

  setIfPresent(row, "external_id", patch.externalId);
  setIfPresent(
    row,
    "closed_at",
    normalizeTimestampValue("closed_at", patch.closedAt, normalizedDates),
  );
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
  setIfPresent(
    row,
    "data_proxima_acao",
    normalizeDateOnlyValue(
      "data_proxima_acao",
      patch.dataProximaAcao,
      normalizedDates,
    ),
  );
  setIfPresent(
    row,
    "created_at",
    normalizeTimestampValue("created_at", patch.createdAt, normalizedDates),
  );

  return { normalizedDates, updatePayload: row };
}

function mapCrmLeadToAuthenticatedSupabaseInsert(lead: CrmLead) {
  const { updatePayload } =
    mapCrmLeadPatchToAuthenticatedSupabaseRow(lead);

  return {
    insertPayload: {
      ...updatePayload,
      id: lead.id,
      source_system: "evolv",
    },
  };
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

function normalizeDateOnlyValue(
  field: string,
  value: unknown,
  normalizedDates: DateNormalizationLog[],
) {
  const normalizedValue = normalizeDateValue(field, value, "date");

  if (normalizedValue.changed) {
    normalizedDates.push({
      field,
      from: value,
      to: normalizedValue.value,
    });
  }

  return normalizedValue.value;
}

function normalizeTimestampValue(
  field: string,
  value: unknown,
  normalizedDates: DateNormalizationLog[],
) {
  const normalizedValue = normalizeDateValue(field, value, "timestamp");

  if (normalizedValue.changed) {
    normalizedDates.push({
      field,
      from: value,
      to: normalizedValue.value,
    });
  }

  return normalizedValue.value;
}

function normalizeDateValue(
  field: string,
  value: unknown,
  mode: "date" | "timestamp",
): { changed: boolean; value: string | null | undefined } {
  if (value === undefined) {
    return { changed: false, value: undefined };
  }

  if (value === null) {
    return { changed: false, value: null };
  }

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      console.warn(
        "[EVOLV CRM] Authenticated shadow removeu campo de data invalido.",
        {
          field,
        },
      );

      return { changed: true, value: undefined };
    }

    const isoValue = value.toISOString();

    return {
      changed: true,
      value: mode === "date" ? isoValue.slice(0, 10) : isoValue,
    };
  }

  if (typeof value !== "string") {
    console.warn(
      "[EVOLV CRM] Authenticated shadow removeu campo de data com tipo inesperado.",
      {
        field,
        type: typeof value,
      },
    );

    return { changed: true, value: undefined };
  }

  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return { changed: true, value: null };
  }

  const brazilianDate = parseBrazilianDate(trimmedValue);

  if (brazilianDate) {
    return {
      changed: true,
      value:
        mode === "date"
          ? brazilianDate.dateOnly
          : `${brazilianDate.dateOnly}T${brazilianDate.time ?? "00:00:00"}.000Z`,
    };
  }

  const isoDateOnlyMatch = trimmedValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (isoDateOnlyMatch) {
    return {
      changed: false,
      value:
        mode === "date" ? trimmedValue : `${trimmedValue}T00:00:00.000Z`,
    };
  }

  const parsedDate = new Date(trimmedValue);

  if (!Number.isNaN(parsedDate.getTime())) {
    const isoValue = parsedDate.toISOString();

    return {
      changed: isoValue !== trimmedValue,
      value: mode === "date" ? isoValue.slice(0, 10) : isoValue,
    };
  }

  console.warn(
    "[EVOLV CRM] Authenticated shadow removeu campo de data invalido.",
    {
      field,
    },
  );

  return { changed: true, value: undefined };
}

function parseBrazilianDate(value: string) {
  const match = value.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/,
  );

  if (!match) {
    return null;
  }

  const [, dayText, monthText, yearText, hourText, minuteText, secondText] =
    match;
  const day = Number(dayText);
  const month = Number(monthText);
  const year = Number(yearText);
  const hour = hourText ? Number(hourText) : 0;
  const minute = minuteText ? Number(minuteText) : 0;
  const second = secondText ? Number(secondText) : 0;
  const date = new Date(Date.UTC(year, month - 1, day, hour, minute, second));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day ||
    date.getUTCHours() !== hour ||
    date.getUTCMinutes() !== minute ||
    date.getUTCSeconds() !== second
  ) {
    return null;
  }

  return {
    dateOnly: date.toISOString().slice(0, 10),
    time: `${String(hour).padStart(2, "0")}:${String(minute).padStart(
      2,
      "0",
    )}:${String(second).padStart(2, "0")}`,
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
