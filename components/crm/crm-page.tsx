"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { CrmLeadDetail } from "@/components/crm/crm-lead-detail";
import { Button } from "@/components/ui/button";
import {
  crmPipelineLabels,
  crmPipelines,
  crmStageLabels,
  crmTemperatureLabels,
  deleteCrmLead,
  emptyCrmLeadInput,
  getDefaultStageForPipeline,
  getStagesForPipeline,
  isStageInPipeline,
  loadCrmActivities,
  loadCrmLeads,
  recordCrmStageChange,
  saveCrmLead,
  summarizeCrmPipeline,
  updateCrmLeadStage,
  type CrmActivity,
  type CrmLead,
  type CrmLeadInput,
  type CrmPipeline,
  type CrmStage,
  type CrmTemperature,
} from "@/modules/crm";
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

export function CrmPage() {
  const [leads, setLeads] = useState<CrmLead[]>([]);
  const [activities, setActivities] = useState<CrmActivity[]>([]);
  const [draft, setDraft] = useState<CrmLeadInput>(emptyCrmLeadInput);
  const [editingLeadId, setEditingLeadId] = useState<string | null>(null);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState("");
  const [filters, setFilters] = useState({
    search: "",
    pipeline: "all" as CrmPipeline | "all",
    stage: "all" as CrmStage | "all",
    origem: "all",
    temperature: "all" as CrmTemperature | "all",
    consultor: "all",
    produtoInteresse: "all",
  });

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setLeads(loadCrmLeads());
      setActivities(loadCrmActivities());
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const filteredLeads = useMemo(
    () => filterCrmLeads(leads, filters),
    [filters, leads],
  );
  const summary = useMemo(
    () => summarizeCrmPipeline(filteredLeads),
    [filteredLeads],
  );
  const totalFilteredPotential = useMemo(
    () =>
      filteredLeads.reduce((total, lead) => total + lead.valorPretendido, 0),
    [filteredLeads],
  );
  const filterOptions = useMemo(() => buildFilterOptions(leads), [leads]);
  const selectedLead = selectedLeadId
    ? leads.find((lead) => lead.id === selectedLeadId)
    : undefined;

  if (selectedLead) {
    return (
      <CrmLeadDetail
        lead={selectedLead}
        onBack={() => {
          setSelectedLeadId(null);
          setActivities(loadCrmActivities());
        }}
      />
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLeads(saveCrmLead(draft, editingLeadId ?? undefined));
    setDraft(emptyCrmLeadInput);
    setTagInput("");
    setEditingLeadId(null);
  }

  function handleEditLead(lead: CrmLead) {
    setEditingLeadId(lead.id);
    setDraft({
      nome: lead.nome,
      telefone: lead.telefone,
      email: lead.email,
      origem: lead.origem,
      consultor: lead.consultor,
      valorPretendido: lead.valorPretendido,
      observacoes: lead.observacoes,
      pipeline: lead.pipeline,
      etapa: lead.etapa,
      tags: lead.tags,
      produtoInteresse: lead.produtoInteresse,
      temperatura: lead.temperatura,
      proximaAcao: lead.proximaAcao,
      dataProximaAcao: lead.dataProximaAcao,
    });
    setTagInput(lead.tags.join(", "));
  }

  function handleCancelEdit() {
    setEditingLeadId(null);
    setDraft(emptyCrmLeadInput);
    setTagInput("");
  }

  function handleDeleteLead(leadId: string) {
    setLeads(deleteCrmLead(leadId));

    if (editingLeadId === leadId) {
      handleCancelEdit();
    }

    if (selectedLeadId === leadId) {
      setSelectedLeadId(null);
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
    const nextStage =
      etapa ??
      (isStageInPipeline(pipeline, lead.etapa)
        ? lead.etapa
        : getDefaultStageForPipeline(pipeline));

    recordCrmStageChange({
      leadId: lead.id,
      fromPipeline: lead.pipeline,
      fromStage: lead.etapa,
      toPipeline: pipeline,
      toStage: nextStage,
    });
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
            <CrmSummaryMetric label="Filtrados" value={summary.totalLeads} />
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

      <section className="executive-surface rounded-md p-5 sm:p-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-semibold">Filtros operacionais</h2>
          <p className="text-sm text-muted-foreground">
            Busca simples e leitura rapida do funil comercial.
          </p>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Busca">
            <input
              className={fieldInputClass}
              onChange={(event) =>
                setFilters((currentFilters) => ({
                  ...currentFilters,
                  search: event.target.value,
                }))
              }
              placeholder="Nome, telefone ou e-mail"
              value={filters.search}
            />
          </Field>

          <Field label="Pipeline">
            <select
              className={fieldInputClass}
              onChange={(event) =>
                setFilters((currentFilters) => ({
                  ...currentFilters,
                  pipeline: event.target.value as CrmPipeline | "all",
                  stage: "all",
                }))
              }
              value={filters.pipeline}
            >
              <option value="all">Todos</option>
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
                setFilters((currentFilters) => ({
                  ...currentFilters,
                  stage: event.target.value as CrmStage | "all",
                }))
              }
              value={filters.stage}
            >
              <option value="all">Todas</option>
              {getFilterStages(filters.pipeline).map((stage) => (
                <option key={stage.key} value={stage.key}>
                  {stage.label}
                </option>
              ))}
            </select>
          </Field>

          <FilterSelect
            label="Origem"
            onChange={(value) =>
              setFilters((currentFilters) => ({
                ...currentFilters,
                origem: value,
              }))
            }
            options={filterOptions.origens}
            value={filters.origem}
          />

          <Field label="Temperatura">
            <select
              className={fieldInputClass}
              onChange={(event) =>
                setFilters((currentFilters) => ({
                  ...currentFilters,
                  temperature: event.target.value as CrmTemperature | "all",
                }))
              }
              value={filters.temperature}
            >
              <option value="all">Todas</option>
              {Object.entries(crmTemperatureLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </Field>

          <FilterSelect
            label="Responsavel"
            onChange={(value) =>
              setFilters((currentFilters) => ({
                ...currentFilters,
                consultor: value,
              }))
            }
            options={filterOptions.consultores}
            value={filters.consultor}
          />

          <FilterSelect
            label="Produto de interesse"
            onChange={(value) =>
              setFilters((currentFilters) => ({
                ...currentFilters,
                produtoInteresse: value,
              }))
            }
            options={filterOptions.produtos}
            value={filters.produtoInteresse}
          />
        </div>

        <div className="mt-5 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-6">
          <CrmSummaryMetric label="Leads filtrados" value={summary.totalLeads} />
          <CrmSummaryMetric label="Prospeccao" value={summary.prospecting} />
          <CrmSummaryMetric label="Vendas" value={summary.sales} />
          <CrmSummaryMetric
            label="Administrativo"
            value={summary.administrative}
          />
          <CrmSummaryMetric label="Perdidos" value={summary.lost} />
          <CrmSummaryMetric
            label="Potencial filtrado"
            value={currencyFormatter.format(totalFilteredPotential)}
          />
        </div>
      </section>

      <section className="executive-surface rounded-md p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold">
              {editingLeadId ? "Editar lead" : "Criar lead"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Cadastro simples para substituir o funil operacional atual.
            </p>
          </div>
          {editingLeadId ? (
            <Button onClick={handleCancelEdit} type="button" variant="ghost">
              Cancelar edicao
            </Button>
          ) : null}
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

            <Field label="Produto de interesse">
              <input
                className={fieldInputClass}
                onChange={(event) =>
                  setDraft((currentDraft) => ({
                    ...currentDraft,
                    produtoInteresse: event.target.value,
                  }))
                }
                placeholder="P&S, consorcio, multi-cotas..."
                value={draft.produtoInteresse}
              />
            </Field>

            <Field label="Temperatura">
              <select
                className={fieldInputClass}
                onChange={(event) =>
                  setDraft((currentDraft) => ({
                    ...currentDraft,
                    temperatura: event.target.value as CrmTemperature,
                  }))
                }
                value={draft.temperatura}
              >
                {Object.entries(crmTemperatureLabels).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Proxima acao">
              <input
                className={fieldInputClass}
                onChange={(event) =>
                  setDraft((currentDraft) => ({
                    ...currentDraft,
                    proximaAcao: event.target.value,
                  }))
                }
                placeholder="Ligar, enviar proposta..."
                value={draft.proximaAcao}
              />
            </Field>

            <Field label="Data da proxima acao">
              <input
                className={fieldInputClass}
                onChange={(event) =>
                  setDraft((currentDraft) => ({
                    ...currentDraft,
                    dataProximaAcao: event.target.value,
                  }))
                }
                type="date"
                value={draft.dataProximaAcao}
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

          <Field label="Tags">
            <input
              className={fieldInputClass}
              onChange={(event) => {
                setTagInput(event.target.value);
                setDraft((currentDraft) => ({
                  ...currentDraft,
                  tags: parseTags(event.target.value),
                }));
              }}
              placeholder="investidor, retorno, indicacao"
              value={tagInput}
            />
          </Field>

          <Field label="Observacoes">
            <textarea
              className={cn(fieldInputClass, "min-h-24 resize-y")}
              onChange={(event) =>
                setDraft((currentDraft) => ({
                  ...currentDraft,
                  observacoes: event.target.value,
                }))
              }
              placeholder="Contexto comercial, objecoes e combinados."
              value={draft.observacoes}
            />
          </Field>

          <div className="flex flex-wrap gap-3">
            <Button type="submit">
              <Plus className="h-4 w-4" aria-hidden />
              {editingLeadId ? "Salvar lead" : "Criar lead"}
            </Button>
            {editingLeadId ? (
              <Button onClick={handleCancelEdit} type="button" variant="ghost">
                Cancelar
              </Button>
            ) : null}
          </div>
        </form>
      </section>

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
                {
                  filteredLeads.filter((lead) => lead.pipeline === pipeline.key)
                    .length
                }{" "}
                leads filtrados
              </p>
            </div>

            <div className="mt-5 grid gap-4 overflow-x-auto pb-2 xl:grid-cols-3 2xl:grid-cols-6">
              {pipeline.stages.map((stage) => {
                const stageLeads = filteredLeads.filter(
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
                            nextActivity={getNextPendingActivity(
                              lead.id,
                              activities,
                            )}
                            onDelete={handleDeleteLead}
                            onEdit={handleEditLead}
                            onOpen={setSelectedLeadId}
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
    </section>
  );
}

function CrmSummaryMetric({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
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
  nextActivity,
  onDelete,
  onEdit,
  onOpen,
  onMove,
}: {
  lead: CrmLead;
  nextActivity?: CrmActivity;
  onDelete: (leadId: string) => void;
  onEdit: (lead: CrmLead) => void;
  onOpen: (leadId: string) => void;
  onMove: (lead: CrmLead, pipeline: CrmPipeline, etapa?: CrmStage) => void;
}) {
  const nextActionOverdue = isLeadNextActionOverdue(lead);

  return (
    <article
      className="cursor-pointer rounded-md border bg-card p-4 shadow-sm transition hover:border-primary/30 hover:shadow-md"
      onClick={() => onOpen(lead.id)}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="font-semibold text-foreground">{lead.nome}</h4>
          <p className="mt-1 text-sm text-muted-foreground">
            {lead.telefone || "Telefone nao informado"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {lead.email || "E-mail nao informado"}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
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
          <span
            className={cn(
              "rounded-full border px-2 py-0.5 text-xs font-medium",
              lead.temperatura === "quente"
                ? "border-primary/30 bg-primary/5 text-primary"
                : lead.temperatura === "fria"
                  ? "text-muted-foreground"
                  : "border-brand-gold/40 text-brand-ink",
            )}
          >
            {crmTemperatureLabels[lead.temperatura]}
          </span>
        </div>
      </div>

      <div className="mt-4 grid gap-2 text-sm">
        <LeadDetail label="Origem" value={lead.origem || "-"} />
        <LeadDetail label="Responsavel" value={lead.consultor || "-"} />
        <LeadDetail
          label="Produto"
          value={lead.produtoInteresse || "-"}
        />
        <LeadDetail
          label="Valor P&S"
          value={currencyFormatter.format(lead.valorPretendido)}
        />
        <LeadDetail
          label="Criado"
          value={dateFormatter.format(new Date(lead.createdAt))}
        />
        <LeadDetail
          label="Atualizado"
          value={dateFormatter.format(new Date(lead.updatedAt))}
        />
      </div>

      {lead.proximaAcao || lead.dataProximaAcao || nextActivity ? (
        <div
          className={cn(
            "mt-4 rounded-md border bg-background/70 p-3 text-xs",
            nextActionOverdue
              ? "border-destructive/25 text-destructive"
              : "text-muted-foreground",
          )}
        >
          <p className="font-medium text-foreground">Proxima acao</p>
          <p className="mt-1">
            {lead.proximaAcao ||
              nextActivity?.titulo ||
              "Atividade pendente registrada"}
          </p>
          <p className="mt-1">
            {lead.dataProximaAcao
              ? formatDateOnly(lead.dataProximaAcao)
              : nextActivity
                ? formatActivitySchedule(nextActivity)
                : "Sem data definida"}
          </p>
        </div>
      ) : null}

      {lead.tags.length ? (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {lead.tags.map((tag) => (
            <span
              className="rounded-full border bg-background px-2 py-0.5 text-xs text-muted-foreground"
              key={tag}
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-4 grid gap-3">
        <select
          className={cn(fieldInputClass, "h-9 py-1 text-xs")}
          onClick={(event) => event.stopPropagation()}
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
          onClick={(event) => event.stopPropagation()}
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
          onClick={(event) => {
            event.stopPropagation();
            onEdit(lead);
          }}
          size="sm"
          type="button"
          variant="secondary"
        >
          <Pencil className="h-3.5 w-3.5" aria-hidden />
          Editar
        </Button>
        <Button
          className="flex-1"
          onClick={(event) => {
            event.stopPropagation();
            onDelete(lead.id);
          }}
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

function FilterSelect({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: string[];
  value: string;
}) {
  return (
    <Field label={label}>
      <select
        className={fieldInputClass}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        <option value="all">Todos</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </Field>
  );
}

function filterCrmLeads(
  leads: CrmLead[],
  filters: {
    search: string;
    pipeline: CrmPipeline | "all";
    stage: CrmStage | "all";
    origem: string;
    temperature: CrmTemperature | "all";
    consultor: string;
    produtoInteresse: string;
  },
) {
  const normalizedSearch = normalizeSearch(filters.search);

  return leads.filter((lead) => {
    const matchesSearch =
      !normalizedSearch ||
      normalizeSearch(
        `${lead.nome} ${lead.telefone} ${lead.email}`,
      ).includes(normalizedSearch);
    const matchesPipeline =
      filters.pipeline === "all" || lead.pipeline === filters.pipeline;
    const matchesStage = filters.stage === "all" || lead.etapa === filters.stage;
    const matchesOrigem =
      filters.origem === "all" || lead.origem === filters.origem;
    const matchesTemperature =
      filters.temperature === "all" ||
      lead.temperatura === filters.temperature;
    const matchesConsultor =
      filters.consultor === "all" || lead.consultor === filters.consultor;
    const matchesProduct =
      filters.produtoInteresse === "all" ||
      lead.produtoInteresse === filters.produtoInteresse;

    return (
      matchesSearch &&
      matchesPipeline &&
      matchesStage &&
      matchesOrigem &&
      matchesTemperature &&
      matchesConsultor &&
      matchesProduct
    );
  });
}

function buildFilterOptions(leads: CrmLead[]) {
  return {
    origens: uniqueFilledValues(leads.map((lead) => lead.origem)),
    consultores: uniqueFilledValues(leads.map((lead) => lead.consultor)),
    produtos: uniqueFilledValues(leads.map((lead) => lead.produtoInteresse)),
  };
}

function getFilterStages(pipeline: CrmPipeline | "all") {
  if (pipeline === "all") {
    return crmPipelines.flatMap((item) => item.stages);
  }

  return getStagesForPipeline(pipeline);
}

function parseTags(value: string) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function getNextPendingActivity(leadId: string, activities: CrmActivity[]) {
  return activities
    .filter(
      (activity) =>
        activity.leadId === leadId && activity.status === "pending",
    )
    .sort((left, right) => {
      const leftTimestamp = getActivityTimestamp(left);
      const rightTimestamp = getActivityTimestamp(right);

      return leftTimestamp - rightTimestamp;
    })[0];
}

function isLeadNextActionOverdue(lead: CrmLead) {
  if (lead.pipeline === "lost" || !lead.dataProximaAcao) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const actionDate = new Date(`${lead.dataProximaAcao}T00:00:00`);

  return actionDate.getTime() < today.getTime();
}

function formatActivitySchedule(activity: CrmActivity) {
  if (activity.data && activity.hora) {
    return `${formatDateOnly(activity.data)} as ${activity.hora}`;
  }

  if (activity.data) {
    return formatDateOnly(activity.data);
  }

  if (activity.hora) {
    return activity.hora;
  }

  return "Sem data definida";
}

function formatDateOnly(date: string) {
  return dateFormatter.format(new Date(`${date}T00:00:00`));
}

function getActivityTimestamp(activity: CrmActivity) {
  if (activity.data) {
    return new Date(`${activity.data}T${activity.hora || "23:59"}`).getTime();
  }

  return new Date(activity.createdAt).getTime();
}

function uniqueFilledValues(values: string[]) {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter(Boolean)),
  ).sort((left, right) => left.localeCompare(right));
}

function normalizeSearch(value: string) {
  return value.trim().toLowerCase();
}
