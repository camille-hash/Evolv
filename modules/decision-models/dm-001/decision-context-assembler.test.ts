import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { User as SupabaseUser } from "@supabase/supabase-js";

import type {
  CommercialAttentionDecisionOutputRecord,
  CommercialAttentionDecisionStorage,
  PersistedCommercialAttentionDecision,
} from "./persistence.ts";
import type {
  Dm001AssemblerRequestContext,
  Dm001DecisionContextAssemblerSupabaseClient,
} from "./decision-context-assembler.ts";
import {
  assembleDm001InputForLeadWithServerContext,
  executeDm001ForLeadWithServerContext,
} from "./decision-context-assembler.ts";

type QueryError = {
  message: string;
};

type QueryResult<T> = {
  data: T[] | null;
  error: QueryError | null;
};

type LeadRow = {
  created_at: string | null;
  email: string | null;
  etapa: string | null;
  id: string;
  nome: string | null;
  organization_id: string | null;
  pipeline: string | null;
  produto_interesse: string | null;
  status: string | null;
  telefone: string | null;
  temperatura: string | null;
  updated_at: string | null;
};

class ListQueryDouble<T extends Record<string, unknown>>
  implements PromiseLike<QueryResult<T>>
{
  private rows: T[];

  constructor(rows: T[]) {
    this.rows = rows;
  }

  eq(column: string, value: string) {
    this.rows = this.rows.filter((row) => row[column] === value);
    return this;
  }

  limit(count: number) {
    this.rows = this.rows.slice(0, count);
    return this;
  }

  order() {
    return this;
  }

  then<TResult1 = QueryResult<T>, TResult2 = never>(
    onfulfilled?:
      | ((value: QueryResult<T>) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve({
      data: this.rows,
      error: null,
    }).then(onfulfilled, onrejected);
  }
}

class SingleQueryDouble<T extends Record<string, unknown>> {
  private readonly row: T | null;

  constructor(row: T | null) {
    this.row = row;
  }

  eq(column: string, value: string) {
    const matches = this.row?.[column] === value;

    return {
      maybeSingle: () =>
        Promise.resolve({
          data: matches ? this.row : null,
          error: null,
        }),
    };
  }
}

class AssemblerSupabaseDouble {
  lead: LeadRow | null = {
    created_at: "2026-06-29T10:00:00.000Z",
    email: "cliente@example.com",
    etapa: "negociacao",
    id: "lead-1",
    nome: "Cliente Teste",
    organization_id: "org-1",
    pipeline: "comercial",
    produto_interesse: "consorcio",
    status: "ativa",
    telefone: "11999999999",
    temperatura: "quente",
    updated_at: "2026-06-29T11:00:00.000Z",
  };
  knowledgeItems: Array<Record<string, unknown>> = [
    {
      confidence: "HIGH",
      created_at: "2026-06-29T11:20:00.000Z",
      id: "knowledge-1",
      knowledge_type: "objective",
      lead_id: "lead-1",
      organization_id: "org-1",
      status: "ACTIVE",
      summary: "Busca compra patrimonial.",
      title: "Objetivo patrimonial",
      updated_at: "2026-06-29T11:20:00.000Z",
    },
  ];
  notes: Array<Record<string, unknown>> = [
    {
      content: "Cliente pediu comparacao.",
      created_at: "2026-06-29T11:10:00.000Z",
      deleted_at: null,
      id: "note-1",
      is_internal: false,
      lead_id: "lead-1",
      note_type: "general",
      organization_id: "org-1",
      updated_at: "2026-06-29T11:10:00.000Z",
    },
  ];
  simulations: Array<Record<string, unknown>> = [
    {
      archived_at: null,
      created_at: "2026-06-29T11:30:00.000Z",
      id: "simulation-1",
      lead_id: "lead-1",
      organization_id: "org-1",
      simulation_type: "commercial",
      status: "draft",
      title: "Simulacao Comercial",
      updated_at: "2026-06-29T11:30:00.000Z",
    },
  ];
  tasks: Array<Record<string, unknown>> = [
    {
      created_at: "2026-06-29T11:40:00.000Z",
      due_date: "2026-06-30",
      due_time: "09:00",
      id: "task-1",
      lead_id: "lead-1",
      organization_id: "org-1",
      status: "pending",
      task_type: "call",
      title: "Ligar para cliente",
      updated_at: "2026-06-29T11:40:00.000Z",
    },
  ];

  from(table: string) {
    if (table === "crm_leads") {
      return {
        select: () => new SingleQueryDouble(this.lead),
      };
    }

    if (table === "crm_tasks") {
      return {
        select: () => new ListQueryDouble(this.tasks),
      };
    }

    if (table === "crm_lead_notes") {
      return {
        select: () => new ListQueryDouble(this.notes),
      };
    }

    if (table === "crm_lead_simulations") {
      return {
        select: () => new ListQueryDouble(this.simulations),
      };
    }

    if (table === "lead_knowledge_items") {
      return {
        select: () => new ListQueryDouble(this.knowledgeItems),
      };
    }

    throw new Error(`Unexpected table ${table}.`);
  }
}

function createContext(
  supabase: AssemblerSupabaseDouble,
): Dm001AssemblerRequestContext {
  return {
    profile: {
      id: "user-1",
      is_active: true,
      organization_id: "org-1",
      role: "admin",
    },
    supabase: supabase as unknown as Dm001DecisionContextAssemblerSupabaseClient,
    user: { id: "user-1" } as SupabaseUser,
  };
}

function createStorage(): {
  insertedRecords: CommercialAttentionDecisionOutputRecord[];
  storage: CommercialAttentionDecisionStorage;
} {
  const insertedRecords: CommercialAttentionDecisionOutputRecord[] = [];

  return {
    insertedRecords,
    storage: {
      async getLatestByLeadModelVersion() {
        return null;
      },
      async insert(record) {
        insertedRecords.push(record);

        const persisted: PersistedCommercialAttentionDecision = {
          createdAt: "2026-06-29T12:01:00.000Z",
          id: "persisted-assembler-1",
          leadId: record.lead_id,
          organizationId: record.organization_id,
          snapshot: {
            attentionScore: record.attention_score,
            calibrationStatus: record.calibration_status,
            confidence: record.confidence,
            decision: record.decision,
            evidenceTrace: record.evidence_trace,
            generatedAt: record.generated_at,
            metadata: record.metadata,
            modelId: record.model_id,
            modelName: record.model_name,
            modelVersion: record.model_version,
            output: record.output,
            rationale: record.rationale,
            recommendedAction: record.recommended_action,
            scoreContributors: record.score_contributors,
            signals: record.signals,
          },
        };

        return persisted;
      },
    },
  };
}

describe("DM-001 decision context assembler", () => {
  it("assembles Dm001Input from existing lead evidence", async () => {
    const supabase = new AssemblerSupabaseDouble();

    const result = await assembleDm001InputForLeadWithServerContext(
      createContext(supabase),
      "lead-1",
      { generatedAt: "2026-06-29T12:00:00.000Z" },
    );

    assert.equal(result.ok, true);

    if (!result.ok) {
      return;
    }

    assert.equal(result.input.leadId, "lead-1");
    assert.equal(result.input.organizationId, "org-1");
    assert.equal(result.input.generatedAt, "2026-06-29T12:00:00.000Z");
    assert.equal(result.input.decisionContext.engagement.positive?.length, 2);
    assert.equal(result.input.decisionContext.continuity.positive?.length, 1);
    assert.equal(
      result.input.decisionContext.operationalReadiness.positive?.length,
      1,
    );
    assert.equal(result.input.decisionContext.productFit.positive?.length, 2);
    assert.equal(result.input.decisionContext.timing.positive?.length, 1);
    assert.equal(result.input.decisionContext.confidence.positive?.length, 1);
  });

  it("returns not found when the lead does not exist", async () => {
    const supabase = new AssemblerSupabaseDouble();
    supabase.lead = null;

    const result = await assembleDm001InputForLeadWithServerContext(
      createContext(supabase),
      "lead-1",
    );

    assert.equal(result.ok, false);

    if (result.ok) {
      return;
    }

    assert.equal(result.status, 404);
    assert.equal(result.error, "Lead nao encontrado.");
  });

  it("returns not found when the lead belongs to another organization", async () => {
    const supabase = new AssemblerSupabaseDouble();
    supabase.lead = {
      ...supabase.lead,
      organization_id: "org-2",
    } as LeadRow;

    const result = await assembleDm001InputForLeadWithServerContext(
      createContext(supabase),
      "lead-1",
    );

    assert.equal(result.ok, false);

    if (result.ok) {
      return;
    }

    assert.equal(result.status, 404);
    assert.equal(result.error, "Lead nao encontrado.");
  });

  it("keeps optional source absence explicit without failing assembly", async () => {
    const supabase = new AssemblerSupabaseDouble();
    supabase.knowledgeItems = [];
    supabase.notes = [];
    supabase.simulations = [];
    supabase.tasks = [];

    const result = await assembleDm001InputForLeadWithServerContext(
      createContext(supabase),
      "lead-1",
    );

    assert.equal(result.ok, true);

    if (!result.ok) {
      return;
    }

    assert.equal(result.input.decisionContext.continuity.missing?.length, 1);
    assert.equal(result.input.decisionContext.engagement.missing?.length, 1);
    assert.equal(result.input.decisionContext.productFit.missing?.length, 1);
    assert.equal(
      result.input.decisionContext.confidence.insufficientKnowledge?.length,
      1,
    );
  });

  it("executes assembler to service to persisted decision", async () => {
    const supabase = new AssemblerSupabaseDouble();
    const { insertedRecords, storage } = createStorage();

    const result = await executeDm001ForLeadWithServerContext(
      createContext(supabase),
      "lead-1",
      {
        generatedAt: "2026-06-29T12:00:00.000Z",
        persistedAt: "2026-06-29T12:01:00.000Z",
        storage,
      },
    );

    assert.equal(result.ok, true);

    if (!result.ok) {
      return;
    }

    assert.equal(result.decision.modelId, "DM-001");
    assert.equal(result.persistedDecision.id, "persisted-assembler-1");
    assert.equal(insertedRecords.length, 1);
    assert.equal(insertedRecords[0]?.lead_id, "lead-1");
    assert.equal(insertedRecords[0]?.organization_id, "org-1");
  });
});
