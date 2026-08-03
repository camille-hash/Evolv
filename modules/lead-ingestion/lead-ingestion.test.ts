import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  assertLeadIngestionStatusTransition,
  createLeadIngestionIntegrationConfig,
  mapNormalizedPayloadToCrmLeadInsert,
  materializeLeadIngestionEvent,
  normalizeEmail,
  normalizeLeadIngestionPayload,
  normalizePhone,
  recordLeadIngestionEvent,
  sanitizeLeadIngestionErrorMessage,
  updateLeadIngestionEventStatus,
  type LeadIngestionCrmLeadRow,
  type LeadIngestionEventRow,
  type LeadIngestionIntegrationConfigRow,
} from "./index.ts";
import type { LeadIngestionSupabaseClient } from "./types.ts";

test("creates a valid integration configuration", async () => {
  const supabase = createFakeLeadIngestionSupabase();

  const result = await createLeadIngestionIntegrationConfig({
    externalAccountId: "page-1",
    organizationId: "org-1",
    sourceSystem: "meta_lead_ads",
    supabase,
  });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.integrationConfig.organizationId, "org-1");
    assert.equal(result.integrationConfig.status, "active");
  }
});

test("resolves organization by source system and external account id", async () => {
  const supabase = createFakeLeadIngestionSupabase();
  await seedIntegration(supabase);

  const result = await recordLeadIngestionEvent({
    input: validRawLeadPayload(),
    supabase,
  });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.integrationConfig?.organizationId, "org-1");
    assert.equal(result.event.organizationId, "org-1");
    assert.equal(result.event.status, "materialization_pending");
  }
});

test("rejects an unknown integration while preserving the event", async () => {
  const supabase = createFakeLeadIngestionSupabase();

  const result = await recordLeadIngestionEvent({
    input: validRawLeadPayload(),
    supabase,
  });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.event.organizationId, null);
    assert.equal(result.event.status, "rejected");
    assert.equal(result.event.lastErrorCode, "INTEGRATION_NOT_FOUND");
  }
});

test("rejects an inactive integration", async () => {
  const supabase = createFakeLeadIngestionSupabase();
  await seedIntegration(supabase, { status: "inactive" });

  const result = await recordLeadIngestionEvent({
    input: validRawLeadPayload(),
    supabase,
  });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.event.status, "rejected");
    assert.equal(result.event.organizationId, "org-1");
    assert.equal(result.event.lastErrorCode, "INTEGRATION_INACTIVE");
  }
});

test("persists the ingestion event payload and normalized payload", async () => {
  const supabase = createFakeLeadIngestionSupabase();
  await seedIntegration(supabase);

  const result = await recordLeadIngestionEvent({
    input: validRawLeadPayload({
      sourcePayload: { field_data: [{ name: "full_name", values: ["Ana"] }] },
    }),
    supabase,
  });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.event.sourcePayload.field_data instanceof Array, true);
    assert.equal(
      (result.event.normalizedPayload as Record<string, unknown>).externalId,
      "leadgen-1",
    );
  }
});

test("does not duplicate repeated external ids", async () => {
  const supabase = createFakeLeadIngestionSupabase();
  await seedIntegration(supabase);

  const first = await recordLeadIngestionEvent({
    input: validRawLeadPayload(),
    supabase,
  });
  const second = await recordLeadIngestionEvent({
    input: validRawLeadPayload(),
    supabase,
  });

  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  assert.equal(supabase.tables.lead_ingestion_events.length, 1);
  if (first.ok && second.ok) {
    assert.equal(second.idempotent, true);
    assert.equal(second.event.id, first.event.id);
  }
});

test("handles idempotent conflict deterministically", async () => {
  const supabase = createFakeLeadIngestionSupabase();
  await seedIntegration(supabase);
  await recordLeadIngestionEvent({ input: validRawLeadPayload(), supabase });

  const repeated = await recordLeadIngestionEvent({
    input: validRawLeadPayload(),
    supabase,
  });

  assert.equal(repeated.ok, true);
  if (repeated.ok) {
    assert.equal(repeated.idempotent, true);
    assert.equal(repeated.event.externalId, "leadgen-1");
  }
});

test("rejects missing name", async () => {
  const supabase = createFakeLeadIngestionSupabase();
  await seedIntegration(supabase);

  const result = await recordLeadIngestionEvent({
    input: validRawLeadPayload({ fullName: "   " }),
    supabase,
  });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.event.status, "rejected");
    assert.equal(result.event.lastErrorCode, "MISSING_NAME");
  }
});

test("rejects missing phone and email together", async () => {
  const supabase = createFakeLeadIngestionSupabase();
  await seedIntegration(supabase);

  const result = await recordLeadIngestionEvent({
    input: validRawLeadPayload({ email: "", phone: "" }),
    supabase,
  });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.event.status, "rejected");
    assert.equal(result.event.lastErrorCode, "MISSING_CONTACT");
  }
});

test("normalizes email conservatively", () => {
  assert.equal(normalizeEmail("  LEAD@Example.COM  "), "lead@example.com");
});

test("normalizes phone without inventing country code", () => {
  assert.equal(normalizePhone(" (11) 98888-7777 "), "11988887777");
});

test("preserves international phone prefix safely", () => {
  assert.equal(normalizePhone(" +1 (415) 555-0111 "), "+14155550111");
});

test("preserves custom answers as extensible key/value records", () => {
  const normalized = normalizeLeadIngestionPayload(
    validRawLeadPayload({
      customAnswers: [
        {
          key: "monthly_investment_capacity",
          label: "Capacidade mensal de investimento",
          value: "R$ 5.000",
        },
        {
          key: "has_cpf",
          label: "Brasileiro e possui CPF",
          value: "Sim",
        },
      ],
    }),
  );

  assert.deepEqual(normalized.customAnswers, [
    {
      key: "monthly_investment_capacity",
      label: "Capacidade mensal de investimento",
      value: "R$ 5.000",
    },
    {
      key: "has_cpf",
      label: "Brasileiro e possui CPF",
      value: "Sim",
    },
  ]);
});

test("materializes a valid event into crm_leads", async () => {
  const supabase = createFakeLeadIngestionSupabase();
  await seedIntegration(supabase);
  const recorded = await recordLeadIngestionEvent({
    input: validRawLeadPayload(),
    supabase,
  });

  assert.equal(recorded.ok, true);
  if (!recorded.ok) {
    return;
  }

  const result = await materializeLeadIngestionEvent({
    eventId: recorded.event.id,
    supabase,
  });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.event.status, "materialized");
    assert.equal(result.event.crmLeadId, result.lead?.id);
    assert.equal(result.lead?.externalId, "leadgen-1");
  }
});

test("uses canonical CRM defaults when mapping a lead", () => {
  const normalized = normalizeLeadIngestionPayload(validRawLeadPayload());
  const payload = mapNormalizedPayloadToCrmLeadInsert({
    ingestionEventId: "event-1",
    normalizedPayload: normalized,
    organizationId: "org-1",
  });

  assert.equal(payload.pipeline, "prospecting");
  assert.equal(payload.etapa, "novos");
  assert.equal(payload.status, "ativa");
  assert.equal(payload.temperatura, "morna");
  assert.equal(payload.origem, "Meta Lead Ads");
});

test("does not invent owner or consultant", () => {
  const normalized = normalizeLeadIngestionPayload(validRawLeadPayload());
  const payload = mapNormalizedPayloadToCrmLeadInsert({
    ingestionEventId: "event-1",
    normalizedPayload: normalized,
    organizationId: "org-1",
  });

  assert.equal(payload.assigned_profile_id, null);
  assert.equal(payload.consultor, "");
});

test("links inbox event and crm lead after materialization", async () => {
  const supabase = createFakeLeadIngestionSupabase();
  await seedIntegration(supabase);
  const recorded = await recordLeadIngestionEvent({
    input: validRawLeadPayload(),
    supabase,
  });

  assert.equal(recorded.ok, true);
  if (!recorded.ok) {
    return;
  }

  const materialized = await materializeLeadIngestionEvent({
    eventId: recorded.event.id,
    supabase,
  });

  assert.equal(materialized.ok, true);
  if (materialized.ok) {
    assert.equal(materialized.event.crmLeadId, materialized.lead?.id);
  }
});

test("does not create a second crm lead on repeated materialization", async () => {
  const supabase = createFakeLeadIngestionSupabase();
  await seedIntegration(supabase);
  const recorded = await recordLeadIngestionEvent({
    input: validRawLeadPayload(),
    supabase,
  });

  assert.equal(recorded.ok, true);
  if (!recorded.ok) {
    return;
  }

  await materializeLeadIngestionEvent({ eventId: recorded.event.id, supabase });
  await materializeLeadIngestionEvent({ eventId: recorded.event.id, supabase });

  assert.equal(supabase.tables.crm_leads.length, 1);
});

test("preserves the event when materialization fails", async () => {
  const supabase = createFakeLeadIngestionSupabase({ failRpc: true });
  await seedIntegration(supabase);
  const recorded = await recordLeadIngestionEvent({
    input: validRawLeadPayload(),
    supabase,
  });

  assert.equal(recorded.ok, true);
  if (!recorded.ok) {
    return;
  }

  const result = await materializeLeadIngestionEvent({
    eventId: recorded.event.id,
    supabase,
  });

  assert.equal(result.ok, false);
  assert.equal(supabase.tables.lead_ingestion_events.length, 1);
  assert.equal(supabase.tables.crm_leads.length, 0);
});

test("allows valid status transitions", () => {
  assert.doesNotThrow(() =>
    assertLeadIngestionStatusTransition("received", "materialization_pending"),
  );
  assert.doesNotThrow(() =>
    assertLeadIngestionStatusTransition("materialization_pending", "materialized"),
  );
});

test("blocks invalid status transitions", () => {
  assert.throws(
    () => assertLeadIngestionStatusTransition("materialized", "received"),
    /Transicao de ingestao invalida/,
  );
});

test("updates status only through validated transition helper", async () => {
  const supabase = createFakeLeadIngestionSupabase();
  await seedIntegration(supabase);
  const recorded = await recordLeadIngestionEvent({
    input: validRawLeadPayload(),
    supabase,
  });

  assert.equal(recorded.ok, true);
  if (!recorded.ok) {
    return;
  }

  const updated = await updateLeadIngestionEventStatus({
    eventId: recorded.event.id,
    fromStatus: "materialization_pending",
    nextStatus: "retry_exhausted",
    supabase,
  });

  assert.equal(updated.ok, true);
  if (updated.ok) {
    assert.equal(updated.event.status, "retry_exhausted");
  }
});

test("does not accept organization id from the payload", async () => {
  const supabase = createFakeLeadIngestionSupabase();
  await seedIntegration(supabase);

  const result = await recordLeadIngestionEvent({
    input: validRawLeadPayload({
      sourcePayload: { organization_id: "attacker-org" },
    }),
    supabase,
  });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.event.organizationId, "org-1");
    assert.notEqual(result.event.organizationId, "attacker-org");
  }
});

test("keeps organization isolation by page configuration", async () => {
  const supabase = createFakeLeadIngestionSupabase();
  await seedIntegration(supabase, {
    externalAccountId: "page-1",
    organizationId: "org-1",
  });
  await seedIntegration(supabase, {
    externalAccountId: "page-2",
    organizationId: "org-2",
  });

  const result = await recordLeadIngestionEvent({
    input: validRawLeadPayload({
      externalAccountId: "page-2",
      externalId: "leadgen-2",
      pageId: "page-2",
    }),
    supabase,
  });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.event.organizationId, "org-2");
  }
});

test("sanitizes PII in error messages", () => {
  assert.equal(
    sanitizeLeadIngestionErrorMessage(
      "Failure for lead@example.com and +55 (11) 99999-0000",
    ),
    "Failure for [email] and [phone]",
  );
});

test("migration preserves events without resolved tenant", () => {
  const migration = readLeadIngestionMigration();

  assert.match(
    migration,
    /integration_config_id uuid null references public\.lead_ingestion_integration_configs/,
  );
  assert.match(
    migration,
    /organization_id uuid null references public\.organizations/,
  );
  assert.match(
    migration,
    /last_error_code = 'INTEGRATION_NOT_FOUND'/,
  );
});

test("migration hardens materialization concurrency", () => {
  const migration = readLeadIngestionMigration();

  assert.match(migration, /where id = p_event_id\s+for update;/);
  assert.match(migration, /when unique_violation then/);
  assert.match(
    migration,
    /where source_system = v_event\.source_system\s+and external_id = v_event\.external_id/,
  );
});

test("migration keeps inbox and RPC closed to browser roles", () => {
  const migration = readLeadIngestionMigration();

  assert.match(
    migration,
    /revoke all on table public\.lead_ingestion_events from anon;/,
  );
  assert.match(
    migration,
    /revoke all on table public\.lead_ingestion_events from authenticated;/,
  );
  assert.match(
    migration,
    /revoke all on function public\.materialize_lead_ingestion_event_transaction\([\s\S]*?\) from public, anon, authenticated;/,
  );
  assert.match(
    migration,
    /grant execute on function public\.materialize_lead_ingestion_event_transaction\([\s\S]*?\) to service_role;/,
  );
});

function validRawLeadPayload(overrides: Record<string, unknown> = {}) {
  return {
    adId: "ad-1",
    adName: "Ad principal",
    adsetId: "adset-1",
    adsetName: "Publico quente",
    campaignId: "campaign-1",
    campaignName: "Campanha Agosto",
    customAnswers: [],
    email: " lead@example.com ",
    eventType: "lead_created",
    externalAccountId: "page-1",
    externalId: "leadgen-1",
    formId: "form-1",
    formName: "Formulario Patrion",
    fullName: " Ana Lead ",
    pageId: "page-1",
    phone: " (11) 98888-7777 ",
    sourcePayload: {},
    sourceSystem: "meta_lead_ads",
    ...overrides,
  };
}

function readLeadIngestionMigration() {
  return readFileSync(
    "supabase/migrations/20260803120000_create_lead_ingestion_foundation.sql",
    "utf8",
  );
}

async function seedIntegration(
  supabase: FakeLeadIngestionSupabase,
  overrides: Partial<{
    externalAccountId: string;
    organizationId: string;
    sourceSystem: string;
    status: "active" | "inactive";
  }> = {},
) {
  const result = await createLeadIngestionIntegrationConfig({
    externalAccountId: overrides.externalAccountId ?? "page-1",
    organizationId: overrides.organizationId ?? "org-1",
    sourceSystem: overrides.sourceSystem ?? "meta_lead_ads",
    status: overrides.status ?? "active",
    supabase,
  });

  assert.equal(result.ok, true);
}

type FakeLeadIngestionSupabase = ReturnType<typeof createFakeLeadIngestionSupabase>;

function createFakeLeadIngestionSupabase(options: { failRpc?: boolean } = {}) {
  const tables = {
    crm_leads: [] as LeadIngestionCrmLeadRow[],
    lead_ingestion_events: [] as LeadIngestionEventRow[],
    lead_ingestion_integration_configs: [] as LeadIngestionIntegrationConfigRow[],
  };

  const supabase = {
    tables,
    from(table: keyof typeof tables) {
      return new FakeQuery(table, tables);
    },
    rpc(name: string, payload: Record<string, unknown>) {
      return {
        maybeSingle: async () => {
          if (options.failRpc) {
            return {
              data: null,
              error: {
                code: "XX000",
                message: "Synthetic failure for +55 (11) 99999-0000",
              },
            };
          }

          if (name !== "materialize_lead_ingestion_event_transaction") {
            return {
              data: null,
              error: { code: "42883", message: "unknown rpc" },
            };
          }

          return materializeFakeEvent(tables, String(payload.p_event_id));
        },
      };
    },
  };

  return supabase as typeof supabase & LeadIngestionSupabaseClient;
}

class FakeQuery {
  private filters: Array<{ column: string; value: unknown }> = [];
  private operation:
    | { payload: Record<string, unknown>; type: "insert" }
    | { payload: Record<string, unknown>; type: "update" }
    | null = null;
  private readonly table: "crm_leads" | "lead_ingestion_events" | "lead_ingestion_integration_configs";
  private readonly tables: {
    crm_leads: LeadIngestionCrmLeadRow[];
    lead_ingestion_events: LeadIngestionEventRow[];
    lead_ingestion_integration_configs: LeadIngestionIntegrationConfigRow[];
  };

  constructor(
    table: "crm_leads" | "lead_ingestion_events" | "lead_ingestion_integration_configs",
    tables: {
      crm_leads: LeadIngestionCrmLeadRow[];
      lead_ingestion_events: LeadIngestionEventRow[];
      lead_ingestion_integration_configs: LeadIngestionIntegrationConfigRow[];
    },
  ) {
    this.table = table;
    this.tables = tables;
  }

  eq(column: string, value: unknown) {
    this.filters.push({ column, value });
    return this;
  }

  insert(payload: Record<string, unknown>) {
    this.operation = { payload, type: "insert" };
    return this;
  }

  maybeSingle(): Promise<{
    data: Record<string, unknown> | null;
    error: { code: string; message: string } | null;
  }> {
    if (this.operation?.type === "update") {
      return this.single();
    }

    const row = this.rows().find((candidate) => this.matches(candidate)) ?? null;

    return Promise.resolve({ data: row, error: null });
  }

  select() {
    return this;
  }

  single(): Promise<{
    data: Record<string, unknown> | null;
    error: { code: string; message: string } | null;
  }> {
    if (this.operation?.type === "insert") {
      return Promise.resolve(this.insertRow(this.operation.payload));
    }

    if (this.operation?.type === "update") {
      const row = this.rows().find((candidate) => this.matches(candidate));

      if (!row) {
        return Promise.resolve({
          data: null,
          error: { code: "PGRST116", message: "No rows" },
        });
      }

      Object.assign(row, this.operation.payload, {
        updated_at: new Date().toISOString(),
      });

      return Promise.resolve({ data: row, error: null });
    }

    return this.maybeSingle();
  }

  update(payload: Record<string, unknown>) {
    this.operation = { payload, type: "update" };
    return this;
  }

  private insertRow(payload: Record<string, unknown>) {
    if (this.table === "lead_ingestion_integration_configs") {
      const duplicate = this.tables.lead_ingestion_integration_configs.some(
        (row) =>
          row.source_system === payload.source_system &&
          row.external_account_id === payload.external_account_id,
      );

      if (duplicate) {
        return {
          data: null,
          error: { code: "23505", message: "duplicate config" },
        };
      }

      const row: LeadIngestionIntegrationConfigRow = {
        created_at: new Date().toISOString(),
        external_account_id: String(payload.external_account_id),
        id: `config-${this.tables.lead_ingestion_integration_configs.length + 1}`,
        organization_id: String(payload.organization_id),
        public_metadata: payload.public_metadata as Record<string, unknown>,
        source_system: String(payload.source_system),
        status: String(payload.status),
        updated_at: new Date().toISOString(),
      };
      this.tables.lead_ingestion_integration_configs.push(row);

      return { data: row, error: null };
    }

    if (this.table === "lead_ingestion_events") {
      const duplicate = this.tables.lead_ingestion_events.some(
        (row) =>
          row.source_system === payload.source_system &&
          row.external_id === payload.external_id,
      );

      if (duplicate) {
        return {
          data: null,
          error: { code: "23505", message: "duplicate event" },
        };
      }

      const row: LeadIngestionEventRow = {
        attempt_count: 0,
        created_at: new Date().toISOString(),
        crm_lead_id: null,
        event_type: String(payload.event_type),
        external_event_id: payload.external_event_id as string | null,
        external_id: String(payload.external_id),
        id: `event-${this.tables.lead_ingestion_events.length + 1}`,
        integration_config_id: payload.integration_config_id as string | null,
        last_error_code: payload.last_error_code as string | null,
        last_error_message: payload.last_error_message as string | null,
        normalized_payload: payload.normalized_payload as Record<string, unknown>,
        organization_id: payload.organization_id as string | null,
        processed_at: null,
        received_at: String(payload.received_at),
        source_payload: payload.source_payload as Record<string, unknown>,
        source_system: String(payload.source_system),
        status: String(payload.status),
        updated_at: new Date().toISOString(),
      };
      this.tables.lead_ingestion_events.push(row);

      return { data: row, error: null };
    }

    return { data: null, error: { code: "Unsupported", message: "Unsupported" } };
  }

  private matches(row: Record<string, unknown>) {
    return this.filters.every((filter) => row[filter.column] === filter.value);
  }

  private rows(): Record<string, unknown>[] {
    return this.tables[this.table] as unknown as Record<string, unknown>[];
  }
}

function materializeFakeEvent(
  tables: {
    crm_leads: LeadIngestionCrmLeadRow[];
    lead_ingestion_events: LeadIngestionEventRow[];
    lead_ingestion_integration_configs: LeadIngestionIntegrationConfigRow[];
  },
  eventId: string,
) {
  const event = tables.lead_ingestion_events.find((row) => row.id === eventId);

  if (!event) {
    return { data: null, error: { code: "P0002", message: "Evento nao encontrado" } };
  }

  if (event.crm_lead_id) {
    const lead = tables.crm_leads.find((row) => row.id === event.crm_lead_id);

    return {
      data: { crm_lead: lead ?? null, ingestion_event: event },
      error: null,
    };
  }

  const normalized = event.normalized_payload as Record<string, unknown>;
  const config = tables.lead_ingestion_integration_configs.find(
    (row) =>
      row.id === event.integration_config_id &&
      row.source_system === event.source_system &&
      row.external_account_id === normalized.externalAccountId,
  );

  if (!config || config.status !== "active") {
    event.status = "rejected";
    event.last_error_code = config ? "INTEGRATION_INACTIVE" : "INTEGRATION_NOT_FOUND";
    event.last_error_message = config
      ? "Integracao de origem inativa."
      : "Integracao de origem nao configurada.";

    return {
      data: { crm_lead: null, ingestion_event: event },
      error: null,
    };
  }

  const fullName = String(normalized.fullName ?? "").trim();
  const phone = String(normalized.phone ?? "").trim();
  const email = String(normalized.email ?? "").trim();

  if (!fullName || (!phone && !email)) {
    event.status = "rejected";
    event.last_error_code = fullName ? "MISSING_CONTACT" : "MISSING_NAME";
    event.last_error_message = fullName
      ? "Telefone ou e-mail obrigatorio ausente."
      : "Nome obrigatorio ausente.";

    return {
      data: { crm_lead: null, ingestion_event: event },
      error: null,
    };
  }

  const existing = tables.crm_leads.find(
    (row) =>
      row.source_system === event.source_system &&
      row.external_id === event.external_id,
  );

  if (existing) {
    event.crm_lead_id = existing.id;
    event.status = "materialized";

    return {
      data: { crm_lead: existing, ingestion_event: event },
      error: null,
    };
  }

  const lead: LeadIngestionCrmLeadRow = {
    email,
    etapa: "novos",
    external_id: event.external_id,
    id: `lead-${tables.crm_leads.length + 1}`,
    nome: fullName,
    organization_id: config.organization_id,
    origem: "Meta Lead Ads",
    pipeline: "prospecting",
    source_system: event.source_system,
    status: "ativa",
    telefone: phone,
    temperatura: "morna",
  };
  tables.crm_leads.push(lead);
  event.crm_lead_id = lead.id;
  event.organization_id = config.organization_id;
  event.processed_at = new Date().toISOString();
  event.status = "materialized";

  return {
    data: { crm_lead: lead, ingestion_event: event },
    error: null,
  };
}
