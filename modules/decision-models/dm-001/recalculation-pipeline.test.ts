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
import type {
  Dm001RecalculationReason,
} from "./recalculation-pipeline.ts";
import { recalculateDm001ForLeadWithServerContext } from "./recalculation-pipeline.ts";

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

class RecalculationSupabaseDouble {
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
  supabase: RecalculationSupabaseDouble,
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
          id: "persisted-recalculation-1",
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

async function runRecalculation(reason: Dm001RecalculationReason) {
  const supabase = new RecalculationSupabaseDouble();
  const { insertedRecords, storage } = createStorage();
  const result = await recalculateDm001ForLeadWithServerContext(
    createContext(supabase),
    "lead-1",
    {
      generatedAt: "2026-06-29T12:00:00.000Z",
      persistedAt: "2026-06-29T12:01:00.000Z",
      reason,
      requestedAt: "2026-06-29T12:02:00.000Z",
      storage,
    },
  );

  assert.equal(result.ok, true);
  assert.equal(result.skipped, false);

  if (!result.ok || result.skipped) {
    throw new Error("Expected recalculation to execute.");
  }

  assert.equal(result.recalculation.reason, reason);
  assert.equal(result.recalculation.requestedAt, "2026-06-29T12:02:00.000Z");
  assert.equal(result.decision.metadata.recalculation?.reason, reason);
  assert.equal(
    result.persistedDecision.snapshot.metadata.recalculation?.reason,
    reason,
  );
  assert.equal(
    result.persistedDecision.snapshot.output.metadata.recalculation?.reason,
    reason,
  );
  assert.equal(insertedRecords.length, 1);
  assert.equal(insertedRecords[0]?.metadata.recalculation?.reason, reason);
  assert.equal(
    insertedRecords[0]?.output.metadata.recalculation?.reason,
    reason,
  );

  return result;
}

describe("DM-001 recalculation pipeline", () => {
  it("recalculates manually and stores recalculation metadata", async () => {
    const result = await runRecalculation("manual_recalculation");

    assert.equal(result.decision.modelId, "DM-001");
    assert.equal(result.persistedDecision.id, "persisted-recalculation-1");
  });

  it("recalculates when a lead is updated", async () => {
    await runRecalculation("lead_updated");
  });

  it("recalculates when a note is created", async () => {
    await runRecalculation("note_created");
  });

  it("recalculates when a task changes", async () => {
    await runRecalculation("task_created");
    await runRecalculation("task_updated");
    await runRecalculation("task_completed");
  });

  it("recalculates when a simulation or knowledge item changes", async () => {
    await runRecalculation("simulation_created");
    await runRecalculation("knowledge_item_updated");
  });

  it("skips decision_model_output_created to avoid recalculation loops", async () => {
    const supabase = new RecalculationSupabaseDouble();
    const { insertedRecords, storage } = createStorage();

    const result = await recalculateDm001ForLeadWithServerContext(
      createContext(supabase),
      "lead-1",
      {
        reason: "decision_model_output_created",
        requestedAt: "2026-06-29T12:02:00.000Z",
        storage,
      },
    );

    assert.equal(result.ok, true);
    assert.equal(result.skipped, true);

    if (!result.ok || !result.skipped) {
      return;
    }

    assert.equal(result.recalculation.reason, "decision_model_output_created");
    assert.equal(insertedRecords.length, 0);
  });
});
