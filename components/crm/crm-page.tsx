"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { CrmLeadDetail } from "@/components/crm/crm-lead-detail";
import { Button } from "@/components/ui/button";
import {
  crmPipelineLabels,
  crmPipelines,
  crmStageLabels,
  deleteCrmLead,
  emptyCrmLeadInput,
  getDefaultStageForPipeline,
  getStagesForPipeline,
  isStageInPipeline,
  loadCrmLeads,
  saveCrmLead,
  summarizeCrmPipeline,
  updateCrmLeadStage,
  type CrmLead,
  type CrmLeadInput,
  type CrmPipeline,
  type CrmStage,
} from "@/modules/crm";
import type { GeneratedProposalRecord } from "@/modules/proposal/proposal-history";
import { cn } from "@/lib/utils";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  currency: "BRL",
  style: "currency",
});

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

const fieldInputClass =
  "w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/15";

type CrmTab = "pipeline" | "settings";

type CrmPageProps = {
  focusedLeadId?: string | null;
  generatedProposalsByLead?: Record<string, GeneratedProposalRecord[]>;
  onGenerateSimulation?: (lead: CrmLead) => void;
  onGenerateProposal?: (lead: CrmLead) => void;
};

export function CrmPage({
  focusedLeadId,
  generatedProposalsByLead = {},
  onGenerateSimulation,
}: CrmPageProps) {
  const [leads, setLeads] = useState<CrmLead[]>([]);
  const [draft, setDraft] = useState<CrmLeadInput>(emptyCrmLeadInput);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<CrmTab>("pipeline");

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const storedLeads = loadCrmLeads();
      const focusedLead = focusedLeadId
        ? storedLeads.find((lead) => lead.id === focusedLeadId)
        : undefined;

      setLeads(storedLeads);

      if (focusedLeadId) {
        setActiveTab("pipeline");
        setSelectedLeadId(focusedLeadId);
      }

      if (focusedLead) {
        setDraft(mapLeadToInput(focusedLead));
      }
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [focusedLeadId]);

  const summary = useMemo(() => summarizeCrmPipeline(leads), [leads]);
  const selectedLead = selectedLeadId
    ? leads.find((lead) => lead.id === selectedLeadId)
    : undefined;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLeads(saveCrmLead(draft));
    setDraft(emptyCrmLeadInput);
  }

  function handleSaveSelectedLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedLeadId) {
      return;
    }

    const nextLeads = saveCrmLead(draft, selectedLeadId);
    const updatedLead = nextLeads.find((lead) => lead.id === selectedLeadId);

    setLeads(nextLeads);

    if (updatedLead) {
      setDraft(mapLeadToInput(updatedLead));
    }
  }

  function handleEditLead(lead: CrmLead) {
    setActiveTab("pipeline");
    setSelectedLeadId(lead.id);
    setDraft(mapLeadToInput(lead));
  }

  function handleCancelEdit() {
    setSelectedLeadId(null);
    setDraft(emptyCrmLeadInput);
  }

  function handleDeleteLead(leadId: string) {
    setLeads(deleteCrmLead(leadId));

    if (selectedLeadId === leadId) {
      handleCancelEdit();
    }
  }

  function handlePipelineChange(pipeline: CrmPipeline) {
    setDraft((currentDraft) => ({
      ...currentDraft,
      pipeline,
      etapa: isStageInPipeline(pipeline, currentDraft.etapa)
        ? currentDraft.etapa
        : getDefaultStageForPipeline(pipeline),
    }));
  }

  function handleMoveLead(
    lead: CrmLead,
    pipeline: CrmPipeline,
    etapa?: CrmStage,
  ) {
    setLeads(updateCrmLeadStage(lead.id, pipeline, etapa));
  }

  return (
    <section className="grid gap-6">
      <section className="executive-surface rounded-md p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Pipeline Bruno
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-foreground">
              CRM Comercial
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Controle local de leads, etapas comerciais e fluxo operacional
              antes da conversao em cliente, simulacao e acompanhamento.
            </p>
          </div>
          <div className="grid gap-2 text-sm sm:grid-cols-5 lg:min-w-[540px]">
            <CrmSummaryMetric label="Total" value={summary.totalLeads} />
            <CrmSummaryMetric label="Prospeccao" value={summary.prospecting} />
            <CrmSummaryMetric label="Vendas" value={summary.sales} />
            <CrmSummaryMetric
              label="Administrativo"
              value={summary.administrative}
            />
            <CrmSummaryMetric label="Perdidos" value={summary.lost} />
          </div>
        </div>
      </section>

      <nav className="flex flex-wrap gap-3">
        <Button
          onClick={() => setActiveTab("pipeline")}
          type="button"
          variant={activeTab === "pipeline" ? "default" : "secondary"}
        >
          Pipeline
        </Button>
        <Button
          onClick={() => setActiveTab("settings")}
          type="button"
          variant={activeTab === "settings" ? "default" : "secondary"}
        >
          Configuracoes
        </Button>
      </nav>

      {activeTab === "pipeline" ? (
        <>
      {selectedLead ? (
        <CrmLeadDetail
          draft={draft}
          lead={selectedLead}
          onCancel={handleCancelEdit}
          onDraftChange={setDraft}
          onGenerateSimulation={onGenerateSimulation}
          onSave={handleSaveSelectedLead}
          proposals={generatedProposalsByLead[selectedLead.id] ?? []}
        />
      ) : (
        <section className="executive-surface rounded-md p-5 sm:p-6">
          <div>
            <h2 className="text-base font-semibold">Criar lead</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Cadastro simples para substituir o funil operacional atual.
            </p>
          </div>

          <form className="mt-5 grid gap-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Field label="Nome">
                <input
                  className={fieldInputClass}
                  onChange={(event) =>
                    setDraft((currentDraft) => ({
                      ...currentDraft,
                      nome: event.target.value,
                    }))
                  }
                  placeholder="Nome do lead"
                  required
                  value={draft.nome}
                />
              </Field>

            <Field label="Telefone">
              <input
                className={fieldInputClass}
                onChange={(event) =>
                  setDraft((currentDraft) => ({
                    ...currentDraft,
                    telefone: event.target.value,
                  }))
                }
                placeholder="(00) 00000-0000"
                value={draft.telefone}
              />
            </Field>

            <Field label="E-mail">
              <input
                className={fieldInputClass}
                onChange={(event) =>
                  setDraft((currentDraft) => ({
                    ...currentDraft,
                    email: event.target.value,
                  }))
                }
                placeholder="cliente@email.com"
                type="email"
                value={draft.email}
              />
            </Field>

            <Field label="Origem">
              <input
                className={fieldInputClass}
                onChange={(event) =>
                  setDraft((currentDraft) => ({
                    ...currentDraft,
                    origem: event.target.value,
                  }))
                }
                placeholder="Indicacao, trafego, evento..."
                value={draft.origem}
              />
            </Field>

            <Field label="Consultor">
              <input
                className={fieldInputClass}
                onChange={(event) =>
                  setDraft((currentDraft) => ({
                    ...currentDraft,
                    consultor: event.target.value,
                  }))
                }
                placeholder="Responsavel"
                value={draft.consultor}
              />
            </Field>

            <Field label="Valor pretendido">
              <input
                className={fieldInputClass}
                min={0}
                onChange={(event) =>
                  setDraft((currentDraft) => ({
                    ...currentDraft,
                    valorPretendido: Number(event.target.value),
                  }))
                }
                type="number"
                value={draft.valorPretendido}
              />
            </Field>

            <Field label="Pipeline">
              <select
                className={fieldInputClass}
                onChange={(event) =>
                  handlePipelineChange(event.target.value as CrmPipeline)
                }
                value={draft.pipeline}
              >
                {crmPipelines.map((pipeline) => (
                  <option key={pipeline.key} value={pipeline.key}>
                    {pipeline.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Etapa">
              <select
                className={fieldInputClass}
                onChange={(event) =>
                  setDraft((currentDraft) => ({
                    ...currentDraft,
                    etapa: event.target.value as CrmStage,
                  }))
                }
                value={draft.etapa}
              >
                {getStagesForPipeline(draft.pipeline).map((stage) => (
                  <option key={stage.key} value={stage.key}>
                    {stage.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Observacoes">
            <textarea
              className={cn(fieldInputClass, "min-h-24 resize-y")}
              onChange={(event) =>
                setDraft((currentDraft) => ({
                  ...currentDraft,
                  observacoes: event.target.value,
                }))
              }
              placeholder="Contexto comercial, objeções e combinados."
              value={draft.observacoes}
            />
          </Field>

            <div className="flex flex-wrap gap-3">
              <Button type="submit">
                <Plus className="h-4 w-4" aria-hidden />
                Criar lead
              </Button>
            </div>
          </form>
        </section>
      )}

      <section className="grid gap-6">
        {crmPipelines.map((pipeline) => (
          <article className="executive-surface rounded-md p-5 sm:p-6" key={pipeline.key}>
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Pipeline
                </p>
                <h2 className="mt-2 text-xl font-semibold text-foreground">
                  {pipeline.label}
                </h2>
              </div>
              <p className="text-sm text-muted-foreground">
                {leads.filter((lead) => lead.pipeline === pipeline.key).length}{" "}
                leads
              </p>
            </div>

            <div className="mt-5 grid gap-4 overflow-x-auto pb-2 xl:grid-cols-3 2xl:grid-cols-6">
              {pipeline.stages.map((stage) => {
                const stageLeads = leads.filter(
                  (lead) => lead.pipeline === pipeline.key && lead.etapa === stage.key,
                );

                return (
                  <section
                    className="min-w-[260px] rounded-md border bg-background/72 p-3"
                    key={stage.key}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-sm font-semibold text-foreground">
                        {stage.label}
                      </h3>
                      <span className="rounded-full border bg-card px-2 py-0.5 text-xs text-muted-foreground">
                        {stageLeads.length}
                      </span>
                    </div>

                    <div className="mt-3 grid gap-3">
                      {stageLeads.length ? (
                        stageLeads.map((lead) => (
                          <LeadCard
                            key={lead.id}
                            lead={lead}
                            onDelete={handleDeleteLead}
                            onEdit={handleEditLead}
                            onMove={handleMoveLead}
                          />
                        ))
                      ) : (
                        <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                          Nenhum lead nesta etapa.
                        </div>
                      )}
                    </div>
                  </section>
                );
              })}
            </div>
          </article>
        ))}
      </section>
        </>
      ) : (
        <CrmSettingsPanel leads={leads} />
      )}
    </section>
  );
}

function mapLeadToInput(lead: CrmLead): CrmLeadInput {
  return {
    externalId: lead.externalId,
    closedAt: lead.closedAt,
    tituloOportunidade: lead.tituloOportunidade,
    nome: lead.nome,
    telefone: lead.telefone,
    email: lead.email,
    pais: lead.pais ?? "",
    origem: lead.origem,
    consultor: lead.consultor,
    valorPretendido: lead.valorPretendido,
    observacoes: lead.observacoes,
    pipeline: lead.pipeline,
    etapa: lead.etapa,
    tags: lead.tags,
    produtoInteresse: lead.produtoInteresse,
    temperatura: lead.temperatura,
    status: lead.status,
    proximaAcao: lead.proximaAcao,
    dataProximaAcao: lead.dataProximaAcao,
  };
}

function CrmSettingsPanel({ leads }: { leads: CrmLead[] }) {
  return (
    <section className="executive-surface rounded-md p-5 sm:p-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Configuracoes
        </p>
        <h2 className="mt-2 text-xl font-semibold text-foreground">
          Configuracoes administrativas do CRM
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Esta area fica reservada para funis, etapas e parametros
          administrativos. Dossies e edicao de leads aparecem apenas no
          contexto operacional do pipeline.
        </p>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {crmPipelines.map((pipeline) => (
          <article className="rounded-md border bg-background/70 p-4" key={pipeline.key}>
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-foreground">
                {pipeline.label}
              </h3>
              <span className="rounded-full border bg-card px-2 py-0.5 text-xs text-muted-foreground">
                {leads.filter((lead) => lead.pipeline === pipeline.key).length}
              </span>
            </div>
            <div className="mt-3 grid gap-2">
              {pipeline.stages.map((stage) => (
                <div
                  className="flex items-center justify-between gap-3 border-b pb-2 text-sm last:border-b-0 last:pb-0"
                  key={stage.key}
                >
                  <span className="text-muted-foreground">{stage.label}</span>
                  <span className="font-medium text-foreground">
                    {
                      leads.filter(
                        (lead) =>
                          lead.pipeline === pipeline.key &&
                          lead.etapa === stage.key,
                      ).length
                    }
                  </span>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function CrmSummaryMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border bg-background/70 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold text-foreground">{value}</p>
    </div>
  );
}

function Field({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium text-foreground">
      <span>{label}</span>
      {children}
    </label>
  );
}

function LeadCard({
  lead,
  onDelete,
  onEdit,
  onMove,
}: {
  lead: CrmLead;
  onDelete: (leadId: string) => void;
  onEdit: (lead: CrmLead) => void;
  onMove: (lead: CrmLead, pipeline: CrmPipeline, etapa?: CrmStage) => void;
}) {
  return (
    <article className="rounded-md border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="font-semibold text-foreground">{lead.nome}</h4>
          <p className="mt-1 text-sm text-muted-foreground">
            {lead.telefone || "Telefone nao informado"}
          </p>
        </div>
        <span
          className={cn(
            "rounded-full border px-2 py-0.5 text-xs font-medium",
            lead.pipeline === "lost"
              ? "border-destructive/20 text-destructive"
              : "text-muted-foreground",
          )}
        >
          {crmPipelineLabels[lead.pipeline]}
        </span>
      </div>

      <div className="mt-4 grid gap-2 text-sm">
        <LeadDetail label="Origem" value={lead.origem || "-"} />
        <LeadDetail
          label="Valor pretendido"
          value={currencyFormatter.format(lead.valorPretendido)}
        />
        <LeadDetail
          label="Atualizado"
          value={dateFormatter.format(new Date(lead.updatedAt))}
        />
      </div>

      <div className="mt-4 grid gap-3">
        <select
          className={cn(fieldInputClass, "h-9 py-1 text-xs")}
          onChange={(event) =>
            onMove(lead, event.target.value as CrmPipeline)
          }
          value={lead.pipeline}
        >
          {crmPipelines.map((pipeline) => (
            <option key={pipeline.key} value={pipeline.key}>
              {pipeline.label}
            </option>
          ))}
        </select>

        <select
          className={cn(fieldInputClass, "h-9 py-1 text-xs")}
          onChange={(event) =>
            onMove(lead, lead.pipeline, event.target.value as CrmStage)
          }
          value={lead.etapa}
        >
          {getStagesForPipeline(lead.pipeline).map((stage) => (
            <option key={stage.key} value={stage.key}>
              {crmStageLabels[stage.key]}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4 flex gap-2">
        <Button
          className="flex-1"
          onClick={() => onEdit(lead)}
          size="sm"
          type="button"
          variant="secondary"
        >
          <Pencil className="h-3.5 w-3.5" aria-hidden />
          Editar
        </Button>
        <Button
          className="flex-1"
          onClick={() => onDelete(lead.id)}
          size="sm"
          type="button"
          variant="ghost"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden />
          Excluir
        </Button>
      </div>
    </article>
  );
}

function LeadDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">{value}</span>
    </div>
  );
}
