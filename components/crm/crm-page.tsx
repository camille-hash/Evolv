"use client";

import {
  useEffect,
  useMemo,
  useState,
  type DragEvent,
  type FormEvent,
} from "react";
import { Pencil, Plus } from "lucide-react";
import { AccessSettingsPage } from "@/components/access/access-settings-page";
import { CrmLeadDetail } from "@/components/crm/crm-lead-detail";
import { Button } from "@/components/ui/button";
import {
  addCrmStageToPipeline,
  buildCrmAdvancedSearchOptions,
  crmTemperatureLabels,
  emptyCrmLeadInput,
  filterCrmLeadsAdvanced,
  getDefaultStageForPipeline,
  isStageInPipeline,
  loadCrmPipelineConfig,
  listCrmLeadsFromRepository,
  mergeLeadPipelinesIntoDefinitions,
  moveCrmStage,
  recordCrmStageChange,
  removeCrmStage,
  resetCrmPipelineConfig,
  resolveCrmLeadMovement,
  saveCrmLead,
  summarizeCrmAdvancedSearch,
  toCrmPipelineDefinitions,
  updateCrmLead,
  updateCrmLeadInRepository,
  updateCrmPipelineName,
  updateCrmStageName,
  type CrmConfigurablePipeline,
  type CrmAdvancedSearchFilters,
  type CrmLead,
  type CrmLeadInput,
  type CrmPipeline,
  type CrmStage,
  type CrmTemperature,
} from "@/modules/crm";
import { cn } from "@/lib/utils";

type CrmOperationalTab =
  | "my-day"
  | "prospecting"
  | "sales"
  | "administrative"
  | "lost"
  | "base"
  | "settings";

type OperationalGroup = "prospecting" | "sales" | "administrative" | "lost";

type OperationalColumn = {
  label: string;
  pipeline: CrmPipeline;
  stage: CrmStage;
};

const crmTabs: Array<{ key: CrmOperationalTab; label: string; quiet?: boolean }> = [
  { key: "my-day", label: "Meu Dia" },
  { key: "prospecting", label: "Prospeccao" },
  { key: "sales", label: "Vendas" },
  { key: "administrative", label: "Administrativo" },
  { key: "base", label: "Base" },
  { key: "settings", label: "Configuracoes" },
  { key: "lost", label: "Perdidos", quiet: true },
];

const groupStages: Record<
  OperationalGroup,
  Array<{ label: string; candidates: string[] }>
> = {
  prospecting: [
    { label: "Novos", candidates: ["novos"] },
    { label: "Abertura", candidates: ["abertura"] },
    { label: "Conexao", candidates: ["conexao", "conexão"] },
    { label: "Qualificados", candidates: ["qualificados"] },
    { label: "Agendamento", candidates: ["agendamento"] },
    { label: "No Show", candidates: ["no show", "no-show"] },
  ],
  sales: [
    { label: "1a reuniao", candidates: ["1a reuniao", "1ª reunião", "primeira-reuniao"] },
    { label: "2a reuniao", candidates: ["2a reuniao", "2ª reunião", "segunda-reuniao"] },
    { label: "Contorno de objecoes", candidates: ["contorno de objecoes", "contorno-objecoes"] },
    { label: "Green Flag", candidates: ["green flag", "green-flag"] },
    { label: "Documentacao", candidates: ["documentacao", "documentação"] },
  ],
  administrative: [
    { label: "Subir contrato", candidates: ["subir contrato", "emissao do contrato", "emissao-contrato"] },
    { label: "Enviar boleto", candidates: ["enviar boleto", "etapa de pagamento", "etapa-pagamento"] },
    { label: "Aguardando assinatura", candidates: ["aguardando assinatura", "aguardando-assinatura"] },
    { label: "Aprovacao da administradora", candidates: ["aprovacao da administradora", "aprovação da administradora", "aprovacao-administradora"] },
  ],
  lost: [],
};

const groupPipelineCandidates: Record<OperationalGroup, string[]> = {
  prospecting: ["prospeccao", "prospecção", "prospecting"],
  sales: ["vendas", "sales"],
  administrative: ["administrativo", "administrative"],
  lost: ["perdidos", "lost"],
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  currency: "BRL",
  style: "currency",
});

const dateOnlyFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
});

const fieldInputClass =
  "w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/15";

export function CrmPage() {
  const [activeTab, setActiveTab] = useState<CrmOperationalTab>("my-day");
  const [leads, setLeads] = useState<CrmLead[]>([]);
  const [pipelineConfig, setPipelineConfig] = useState<
    CrmConfigurablePipeline[]
  >([]);
  const [draft, setDraft] = useState<CrmLeadInput>(emptyCrmLeadInput);
  const [editingLeadId, setEditingLeadId] = useState<string | null>(null);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [baseSearch, setBaseSearch] = useState("");
  const [newStageNames, setNewStageNames] = useState<Record<string, string>>({});
  const [advancedFilters, setAdvancedFilters] =
    useState<CrmAdvancedSearchFilters>({
      consultor: "all",
      freeText: "",
      origem: "all",
      pipeline: "all",
      status: "all",
      temperatura: "all",
    });
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [dragTarget, setDragTarget] = useState<{
    pipeline: CrmPipeline;
    stage: CrmStage;
  } | null>(null);

  useEffect(() => {
    let isMounted = true;

    const timeoutId = window.setTimeout(() => {
      void listCrmLeadsFromRepository().then((repositoryLeads) => {
        if (isMounted) {
          setLeads(repositoryLeads);
        }
      });
      setPipelineConfig(loadCrmPipelineConfig());
    }, 0);

    return () => {
      isMounted = false;
      window.clearTimeout(timeoutId);
    };
  }, []);

  const configuredPipelineDefinitions = useMemo(
    () => toCrmPipelineDefinitions(pipelineConfig),
    [pipelineConfig],
  );
  const kanbanPipelineDefinitions = useMemo(
    () =>
      mergeLeadPipelinesIntoDefinitions({
        leads,
        pipelineDefinitions: configuredPipelineDefinitions,
      }),
    [configuredPipelineDefinitions, leads],
  );
  const selectedLead = selectedLeadId
    ? leads.find((lead) => lead.id === selectedLeadId)
    : undefined;
  const filteredLeads = useMemo(
    () => filterCrmLeadsAdvanced(leads, advancedFilters),
    [advancedFilters, leads],
  );
  const searchOptions = useMemo(
    () => buildCrmAdvancedSearchOptions(leads),
    [leads],
  );
  const searchSummary = useMemo(
    () => summarizeCrmAdvancedSearch(filteredLeads),
    [filteredLeads],
  );
  const myDayGroups = useMemo(
    () => buildMyDayGroups(filteredLeads),
    [filteredLeads],
  );
  const filteredBaseLeads = useMemo(
    () => filterBaseLeads(filteredLeads, baseSearch),
    [baseSearch, filteredLeads],
  );

  if (selectedLead) {
    return (
      <CrmLeadDetail
        lead={selectedLead}
        onBack={() => {
          setSelectedLeadId(null);
        }}
        pipelineLabel={selectedLead.pipeline}
        stageLabel={selectedLead.etapa}
      />
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (editingLeadId) {
      const existingLead = leads.find((lead) => lead.id === editingLeadId);

      if (!existingLead) {
        return;
      }

      const nextLead = updateCrmLead(existingLead, draft);
      const savedLead =
        (await updateCrmLeadInRepository(editingLeadId, nextLead)) ?? nextLead;

      setLeads((currentLeads) =>
        currentLeads.map((lead) =>
          lead.id === editingLeadId ? savedLead : lead,
        ),
      );
    } else {
      setLeads(saveCrmLead(draft));
    }

    setDraft(emptyCrmLeadInput);
    setEditingLeadId(null);
  }

  function handleEditLead(lead: CrmLead) {
    setActiveTab("settings");
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
      status: lead.status,
      proximaAcao: lead.proximaAcao,
      dataProximaAcao: lead.dataProximaAcao,
      pais: lead.pais ?? "",
    });
  }

  function handleCancelEdit() {
    setEditingLeadId(null);
    setDraft(emptyCrmLeadInput);
  }

  function handlePipelineChange(pipeline: CrmPipeline) {
    setDraft((currentDraft) => ({
      ...currentDraft,
      pipeline,
      etapa: isStageInPipeline(
        pipeline,
        currentDraft.etapa,
        kanbanPipelineDefinitions,
      )
        ? currentDraft.etapa
        : getDefaultStageForPipeline(pipeline, kanbanPipelineDefinitions),
    }));
  }

  async function handleMoveLead(
    lead: CrmLead,
    pipeline: CrmPipeline,
    etapa?: CrmStage,
  ) {
    const movement = resolveCrmLeadMovement({
      lead,
      pipeline,
      pipelineDefinitions: kanbanPipelineDefinitions,
      stage: etapa,
    });

    recordCrmStageChange({
      leadId: lead.id,
      fromPipeline: movement.fromPipeline,
      fromStage: movement.fromStage,
      toPipeline: movement.toPipeline,
      toStage: movement.toStage,
    });

    const nextLead: CrmLead = {
      ...lead,
      pipeline: movement.toPipeline,
      etapa: movement.toStage,
      updatedAt: new Date().toISOString(),
    };
    const savedLead =
      (await updateCrmLeadInRepository(lead.id, nextLead)) ?? nextLead;

    setLeads((currentLeads) =>
      currentLeads.map((currentLead) =>
        currentLead.id === lead.id ? savedLead : currentLead,
      ),
    );
  }

  function handleLeadDragStart(leadId: string) {
    setDraggedLeadId(leadId);
  }

  function handleLeadDragEnd() {
    setDraggedLeadId(null);
    setDragTarget(null);
  }

  function handleStageDragOver(
    event: DragEvent<HTMLElement>,
    pipeline: CrmPipeline,
    stage: CrmStage,
  ) {
    if (!draggedLeadId) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDragTarget({ pipeline, stage });
  }

  function handleStageDrop(
    event: DragEvent<HTMLElement>,
    pipeline: CrmPipeline,
    stage: CrmStage,
  ) {
    event.preventDefault();

    const leadId =
      event.dataTransfer.getData("text/plain") || draggedLeadId || "";
    const lead = leads.find((item) => item.id === leadId);

    if (lead) {
      handleMoveLead(lead, pipeline, stage);
    }

    handleLeadDragEnd();
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
              CRM Operacional
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Prioridades do dia, funis por area e consulta rapida da base sem
              excesso de informacao visual.
            </p>
          </div>
          <div className="grid gap-2 text-sm sm:grid-cols-3 lg:min-w-[420px]">
            <CrmSummaryMetric label="Meu dia" value={myDayGroups.total} />
            <CrmSummaryMetric
              label="Quentes"
              value={myDayGroups.hot.length}
            />
            <CrmSummaryMetric label="Base filtrada" value={filteredLeads.length} />
          </div>
        </div>

        <AdvancedSearchPanel
          filters={advancedFilters}
          onChange={setAdvancedFilters}
          options={searchOptions}
          summary={searchSummary}
        />

        <nav className="mt-6 flex gap-2 overflow-x-auto pb-1">
          {crmTabs.map((tab) => (
            <button
              className={cn(
                "h-10 shrink-0 rounded-md border px-4 text-sm font-medium transition",
                activeTab === tab.key
                  ? "border-primary/20 bg-primary text-primary-foreground"
                  : tab.quiet
                    ? "border-transparent text-muted-foreground hover:border-border hover:bg-background/80"
                    : "border-border bg-background/70 text-foreground hover:border-primary/25",
              )}
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </section>

      {activeTab === "my-day" ? (
        <MyDayPanel
          groups={myDayGroups}
          onEdit={handleEditLead}
          onOpen={setSelectedLeadId}
        />
      ) : null}

      {activeTab === "prospecting" ? (
        <OperationalKanban
          columns={buildOperationalColumns({
            group: "prospecting",
            leads: filteredLeads,
            pipelineDefinitions: kanbanPipelineDefinitions,
          })}
          dragTarget={dragTarget}
          group="prospecting"
          leads={filteredLeads}
          onDragEnd={handleLeadDragEnd}
          onDragOver={handleStageDragOver}
          onDragStart={handleLeadDragStart}
          onDrop={handleStageDrop}
          onEdit={handleEditLead}
        />
      ) : null}

      {activeTab === "sales" ? (
        <OperationalKanban
          columns={buildOperationalColumns({
            group: "sales",
            leads: filteredLeads,
            pipelineDefinitions: kanbanPipelineDefinitions,
          })}
          dragTarget={dragTarget}
          group="sales"
          leads={filteredLeads}
          onDragEnd={handleLeadDragEnd}
          onDragOver={handleStageDragOver}
          onDragStart={handleLeadDragStart}
          onDrop={handleStageDrop}
          onEdit={handleEditLead}
        />
      ) : null}

      {activeTab === "administrative" ? (
        <OperationalKanban
          columns={buildOperationalColumns({
            group: "administrative",
            leads: filteredLeads,
            pipelineDefinitions: kanbanPipelineDefinitions,
          })}
          dragTarget={dragTarget}
          group="administrative"
          leads={filteredLeads}
          onDragEnd={handleLeadDragEnd}
          onDragOver={handleStageDragOver}
          onDragStart={handleLeadDragStart}
          onDrop={handleStageDrop}
          onEdit={handleEditLead}
        />
      ) : null}

      {activeTab === "lost" ? (
        <LostLeadsPanel
          leads={filteredLeads.filter((lead) => isLeadInGroup(lead, "lost"))}
          onEdit={handleEditLead}
        />
      ) : null}

      {activeTab === "base" ? (
        <BasePanel
          baseSearch={baseSearch}
          leads={filteredBaseLeads}
          onEdit={handleEditLead}
          onOpen={setSelectedLeadId}
          onSearch={setBaseSearch}
        />
      ) : null}

      {activeTab === "settings" ? (
        <section className="grid gap-6">
          <LeadForm
            draft={draft}
            editingLeadId={editingLeadId}
            kanbanPipelineDefinitions={kanbanPipelineDefinitions}
            onCancel={handleCancelEdit}
            onChange={setDraft}
            onPipelineChange={handlePipelineChange}
            onSubmit={handleSubmit}
          />
          <PipelineSettingsPanel
            newStageNames={newStageNames}
            onNewStageNamesChange={setNewStageNames}
            onPipelineConfigChange={setPipelineConfig}
            pipelineConfig={pipelineConfig}
          />
          <AccessSettingsPage />
        </section>
      ) : null}
    </section>
  );
}

function AdvancedSearchPanel({
  filters,
  onChange,
  options,
  summary,
}: {
  filters: CrmAdvancedSearchFilters;
  onChange: React.Dispatch<React.SetStateAction<CrmAdvancedSearchFilters>>;
  options: ReturnType<typeof buildCrmAdvancedSearchOptions>;
  summary: ReturnType<typeof summarizeCrmAdvancedSearch>;
}) {
  function clearFilters() {
    onChange({
      consultor: "all",
      freeText: "",
      origem: "all",
      pipeline: "all",
      status: "all",
      temperatura: "all",
    });
  }

  return (
    <section className="mt-6 rounded-md border bg-background/72 p-4">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h3 className="font-semibold text-foreground">Busca Avancada</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Filtra todas as abas operacionais do CRM.
          </p>
        </div>
        <Button onClick={clearFilters} type="button" variant="secondary">
          Limpar filtros
        </Button>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        <label className="grid gap-2 text-sm font-medium xl:col-span-2">
          <span>Busca livre</span>
          <input
            className={fieldInputClass}
            onChange={(event) =>
              onChange((currentFilters) => ({
                ...currentFilters,
                freeText: event.target.value,
              }))
            }
            placeholder="Nome, telefone, e-mail, pais, observacao..."
            value={filters.freeText}
          />
        </label>

        <AdvancedSelect
          label="Status"
          onChange={(value) =>
            onChange((currentFilters) => ({
              ...currentFilters,
              status: value as CrmAdvancedSearchFilters["status"],
            }))
          }
          options={[
            ["all", "Todos"],
            ["ativa", "Ativa"],
            ["ganha", "Ganha"],
            ["perdida", "Perdida"],
          ]}
          value={filters.status}
        />

        <AdvancedSelect
          label="Pipeline"
          onChange={(value) =>
            onChange((currentFilters) => ({
              ...currentFilters,
              pipeline: value,
            }))
          }
          options={[
            ["all", "Todos"],
            ...options.pipelines.map((pipeline) => [pipeline, pipeline] as const),
          ]}
          value={filters.pipeline}
        />

        <AdvancedSelect
          label="Responsavel"
          onChange={(value) =>
            onChange((currentFilters) => ({
              ...currentFilters,
              consultor: value,
            }))
          }
          options={[
            ["all", "Todos"],
            ...options.consultores.map(
              (consultor) => [consultor, consultor] as const,
            ),
          ]}
          value={filters.consultor}
        />

        <AdvancedSelect
          label="Temperatura"
          onChange={(value) =>
            onChange((currentFilters) => ({
              ...currentFilters,
              temperatura: value as CrmAdvancedSearchFilters["temperatura"],
            }))
          }
          options={[
            ["all", "Todas"],
            ["fria", "Fria"],
            ["morna", "Morna"],
            ["quente", "Quente"],
          ]}
          value={filters.temperatura}
        />

        <AdvancedSelect
          label="Origem"
          onChange={(value) =>
            onChange((currentFilters) => ({
              ...currentFilters,
              origem: value,
            }))
          }
          options={[
            ["all", "Todas"],
            ...options.origens.map((origem) => [origem, origem] as const),
          ]}
          value={filters.origem}
        />
      </div>

      <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-5">
        <CrmSummaryMetric label="Total encontrado" value={summary.total} />
        <CrmSummaryMetric label="Ativas" value={summary.active} />
        <CrmSummaryMetric label="Ganhas" value={summary.gained} />
        <CrmSummaryMetric label="Perdidas" value={summary.lost} />
        <CrmSummaryMetric
          label="Valor P&S filtrado"
          value={currencyFormatter.format(summary.totalPotential)}
        />
      </div>
    </section>
  );
}

function AdvancedSelect({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: ReadonlyArray<readonly [string, string]>;
  value: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      <span>{label}</span>
      <select
        className={fieldInputClass}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}

function PipelineSettingsPanel({
  newStageNames,
  onNewStageNamesChange,
  onPipelineConfigChange,
  pipelineConfig,
}: {
  newStageNames: Record<string, string>;
  onNewStageNamesChange: React.Dispatch<
    React.SetStateAction<Record<string, string>>
  >;
  onPipelineConfigChange: React.Dispatch<
    React.SetStateAction<CrmConfigurablePipeline[]>
  >;
  pipelineConfig: CrmConfigurablePipeline[];
}) {
  return (
    <section className="executive-surface rounded-md p-5 sm:p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Configuracao
          </p>
          <h2 className="mt-2 text-base font-semibold">
            Configuracao dos Funis
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            Ajuste nomes e etapas sem alterar codigo. Leads importados com
            funil ou etapa do PipeRun continuam preservados.
          </p>
        </div>
        <Button
          onClick={() => onPipelineConfigChange(resetCrmPipelineConfig())}
          type="button"
          variant="secondary"
        >
          Restaurar padrao Patrion
        </Button>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        {pipelineConfig.map((pipeline) => (
          <article
            className="rounded-md border bg-background/70 p-4"
            key={pipeline.id}
          >
            <Field label="Nome do pipeline">
              <input
                className={fieldInputClass}
                onBlur={(event) =>
                  onPipelineConfigChange(
                    updateCrmPipelineName(pipeline.id, event.target.value),
                  )
                }
                onChange={(event) =>
                  onPipelineConfigChange((currentConfig) =>
                    currentConfig.map((item) =>
                      item.id === pipeline.id
                        ? { ...item, nome: event.target.value }
                        : item,
                    ),
                  )
                }
                value={pipeline.nome}
              />
            </Field>

            <div className="mt-4 grid gap-3">
              {pipeline.etapas
                .sort((left, right) => left.ordem - right.ordem)
                .map((stage, index) => (
                  <div
                    className="grid gap-2 rounded-md border bg-card p-3"
                    key={stage.id}
                  >
                    <Field label={`Etapa ${index + 1}`}>
                      <input
                        className={fieldInputClass}
                        onBlur={(event) =>
                          onPipelineConfigChange(
                            updateCrmStageName(
                              pipeline.id,
                              stage.id,
                              event.target.value,
                            ),
                          )
                        }
                        onChange={(event) =>
                          onPipelineConfigChange((currentConfig) =>
                            currentConfig.map((item) =>
                              item.id === pipeline.id
                                ? {
                                    ...item,
                                    etapas: item.etapas.map((stageItem) =>
                                      stageItem.id === stage.id
                                        ? {
                                            ...stageItem,
                                            nome: event.target.value,
                                          }
                                        : stageItem,
                                    ),
                                  }
                                : item,
                            ),
                          )
                        }
                        value={stage.nome}
                      />
                    </Field>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        disabled={index === 0}
                        onClick={() =>
                          onPipelineConfigChange(
                            moveCrmStage(pipeline.id, stage.id, "up"),
                          )
                        }
                        size="sm"
                        type="button"
                        variant="ghost"
                      >
                        Subir
                      </Button>
                      <Button
                        disabled={index === pipeline.etapas.length - 1}
                        onClick={() =>
                          onPipelineConfigChange(
                            moveCrmStage(pipeline.id, stage.id, "down"),
                          )
                        }
                        size="sm"
                        type="button"
                        variant="ghost"
                      >
                        Descer
                      </Button>
                      <Button
                        onClick={() =>
                          onPipelineConfigChange(
                            removeCrmStage(pipeline.id, stage.id),
                          )
                        }
                        size="sm"
                        type="button"
                        variant="ghost"
                      >
                        Remover
                      </Button>
                    </div>
                  </div>
                ))}
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <input
                className={fieldInputClass}
                onChange={(event) =>
                  onNewStageNamesChange((currentNames) => ({
                    ...currentNames,
                    [pipeline.id]: event.target.value,
                  }))
                }
                placeholder="Nova etapa"
                value={newStageNames[pipeline.id] ?? ""}
              />
              <Button
                onClick={() => {
                  onPipelineConfigChange(
                    addCrmStageToPipeline(
                      pipeline.id,
                      newStageNames[pipeline.id] ?? "",
                    ),
                  );
                  onNewStageNamesChange((currentNames) => ({
                    ...currentNames,
                    [pipeline.id]: "",
                  }));
                }}
                type="button"
              >
                Adicionar etapa
              </Button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function MyDayPanel({
  groups,
  onEdit,
  onOpen,
}: {
  groups: ReturnType<typeof buildMyDayGroups>;
  onEdit: (lead: CrmLead) => void;
  onOpen: (leadId: string) => void;
}) {
  return (
    <section className="grid gap-6 xl:grid-cols-3">
      <PriorityBlock
        leads={groups.hot}
        onEdit={onEdit}
        onOpen={onOpen}
        title="Quentes"
      />
      <PriorityBlock
        leads={groups.dueToday}
        onEdit={onEdit}
        onOpen={onOpen}
        title="Vencer hoje"
      />
      <PriorityBlock
        leads={groups.awaitingAction}
        onEdit={onEdit}
        onOpen={onOpen}
        title="Aguardando acao"
      />
    </section>
  );
}

function PriorityBlock({
  leads,
  onEdit,
  onOpen,
  title,
}: {
  leads: CrmLead[];
  onEdit: (lead: CrmLead) => void;
  onOpen: (leadId: string) => void;
  title: string;
}) {
  return (
    <article className="executive-surface rounded-md p-5 text-card-foreground">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold">{title}</h3>
        <span className="rounded-full border bg-background/70 px-2 py-0.5 text-xs text-muted-foreground">
          {leads.length}
        </span>
      </div>
      <div className="mt-4 grid gap-2">
        {leads.length ? (
          leads.slice(0, 12).map((lead) => (
            <DailyLeadCard
              key={lead.id}
              lead={lead}
              onEdit={onEdit}
              onOpen={onOpen}
            />
          ))
        ) : (
          <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            Nada urgente aqui.
          </p>
        )}
      </div>
    </article>
  );
}

function OperationalKanban({
  columns,
  dragTarget,
  group,
  leads,
  onDragEnd,
  onDragOver,
  onDragStart,
  onDrop,
  onEdit,
}: {
  columns: OperationalColumn[];
  dragTarget: { pipeline: CrmPipeline; stage: CrmStage } | null;
  group: OperationalGroup;
  leads: CrmLead[];
  onDragEnd: () => void;
  onDragOver: (
    event: DragEvent<HTMLElement>,
    pipeline: CrmPipeline,
    stage: CrmStage,
  ) => void;
  onDragStart: (leadId: string) => void;
  onDrop: (
    event: DragEvent<HTMLElement>,
    pipeline: CrmPipeline,
    stage: CrmStage,
  ) => void;
  onEdit: (lead: CrmLead) => void;
}) {
  return (
    <section className="executive-surface rounded-md p-5 sm:p-6">
      <div className="grid gap-4 overflow-x-auto pb-2 xl:grid-cols-3 2xl:grid-cols-6">
        {columns.map((column) => {
          const stageLeads = leads.filter(
            (lead) =>
              isLeadInGroup(lead, group) &&
              normalizeKey(lead.etapa) === normalizeKey(column.stage),
          );
          const isActiveDropTarget =
            dragTarget?.pipeline === column.pipeline &&
            dragTarget.stage === column.stage;

          return (
            <section
              className={cn(
                "min-w-[235px] rounded-md border bg-background/72 p-3 transition",
                isActiveDropTarget
                  ? "border-primary/45 bg-primary/5 shadow-sm ring-2 ring-primary/15"
                  : "border-border",
              )}
              key={`${column.pipeline}-${column.stage}`}
              onDragOver={(event) =>
                onDragOver(event, column.pipeline, column.stage)
              }
              onDrop={(event) => onDrop(event, column.pipeline, column.stage)}
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-foreground">
                  {column.label}
                </h3>
                <span className="rounded-full border bg-card px-2 py-0.5 text-xs text-muted-foreground">
                  {stageLeads.length}
                </span>
              </div>
              <div className="mt-3 grid gap-2">
                {stageLeads.length ? (
                  stageLeads.map((lead) => (
                    <CompactLeadCard
                      key={lead.id}
                      lead={lead}
                      mode={group === "administrative" ? "admin" : "sales"}
                      onDragEnd={onDragEnd}
                      onDragStart={onDragStart}
                      onEdit={onEdit}
                    />
                  ))
                ) : (
                  <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                    Sem oportunidades.
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </section>
  );
}

function CompactLeadCard({
  lead,
  mode,
  onDragEnd,
  onDragStart,
  onEdit,
}: {
  lead: CrmLead;
  mode: "sales" | "admin";
  onDragEnd: () => void;
  onDragStart: (leadId: string) => void;
  onEdit: (lead: CrmLead) => void;
}) {
  return (
    <article
      className="cursor-grab rounded-md border bg-card p-3 shadow-sm transition hover:border-primary/30 active:cursor-grabbing"
      draggable
      onDragEnd={onDragEnd}
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", lead.id);
        onDragStart(lead.id);
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="truncate text-sm font-semibold text-foreground">
            {lead.nome}
          </h4>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {lead.telefone || "Sem telefone"}
          </p>
        </div>
        <TemperatureBadge temperature={lead.temperatura} />
      </div>
      <div className="mt-3 grid gap-1 text-xs text-muted-foreground">
        <LeadLine
          label={mode === "admin" ? "Responsavel" : "Valor"}
          value={
            mode === "admin"
              ? lead.consultor || "-"
              : currencyFormatter.format(lead.valorPretendido)
          }
        />
        {mode === "sales" ? (
          <LeadLine label="Proxima" value={lead.proximaAcao || "-"} />
        ) : null}
      </div>
      <Button
        className="mt-3 w-full"
        onClick={() => onEdit(lead)}
        size="sm"
        type="button"
        variant="secondary"
      >
        <Pencil className="h-3.5 w-3.5" aria-hidden />
        Editar
      </Button>
    </article>
  );
}

function DailyLeadCard({
  lead,
  onEdit,
  onOpen,
}: {
  lead: CrmLead;
  onEdit: (lead: CrmLead) => void;
  onOpen: (leadId: string) => void;
}) {
  return (
    <article className="rounded-md border bg-card p-3">
      <button
        className="block w-full text-left"
        onClick={() => onOpen(lead.id)}
        type="button"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h4 className="truncate text-sm font-semibold">{lead.nome}</h4>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {lead.telefone || "Sem telefone"}
            </p>
          </div>
          <TemperatureBadge temperature={lead.temperatura} />
        </div>
        <div className="mt-3 grid gap-1 text-xs text-muted-foreground">
          <LeadLine
            label="Valor P&S"
            value={currencyFormatter.format(lead.valorPretendido)}
          />
          <LeadLine label="Proxima" value={lead.proximaAcao || "-"} />
          <LeadLine label="Responsavel" value={lead.consultor || "-"} />
        </div>
      </button>
      <Button
        className="mt-3 w-full"
        onClick={() => onEdit(lead)}
        size="sm"
        type="button"
        variant="secondary"
      >
        Editar
      </Button>
    </article>
  );
}

function LostLeadsPanel({
  leads,
  onEdit,
}: {
  leads: CrmLead[];
  onEdit: (lead: CrmLead) => void;
}) {
  return (
    <section className="executive-surface rounded-md p-5 sm:p-6">
      <div className="flex flex-col gap-1">
        <h3 className="font-semibold">Perdidos</h3>
        <p className="text-sm text-muted-foreground">
          Lista de recuperacao, treinamento e reativacao de base.
        </p>
      </div>
      <div className="mt-5 overflow-x-auto">
        <table className="min-w-[820px] text-left text-sm">
          <thead className="text-xs uppercase tracking-[0.08em] text-muted-foreground">
            <tr className="border-b">
              <th className="px-3 py-3">Nome</th>
              <th className="px-3 py-3">Telefone</th>
              <th className="px-3 py-3">Motivo</th>
              <th className="px-3 py-3">Responsavel</th>
              <th className="px-3 py-3">Data da perda</th>
              <th className="px-3 py-3">Acao</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr className="border-b last:border-b-0" key={lead.id}>
                <td className="px-3 py-3 font-medium">{lead.nome}</td>
                <td className="px-3 py-3 text-muted-foreground">
                  {lead.telefone || "-"}
                </td>
                <td className="px-3 py-3 text-muted-foreground">
                  {lead.etapa}
                </td>
                <td className="px-3 py-3 text-muted-foreground">
                  {lead.consultor || "-"}
                </td>
                <td className="px-3 py-3 text-muted-foreground">
                  {formatDate(lead.updatedAt)}
                </td>
                <td className="px-3 py-3">
                  <Button
                    onClick={() => onEdit(lead)}
                    size="sm"
                    type="button"
                    variant="secondary"
                  >
                    Editar
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function BasePanel({
  baseSearch,
  leads,
  onEdit,
  onOpen,
  onSearch,
}: {
  baseSearch: string;
  leads: CrmLead[];
  onEdit: (lead: CrmLead) => void;
  onOpen: (leadId: string) => void;
  onSearch: (value: string) => void;
}) {
  return (
    <section className="executive-surface rounded-md p-5 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h3 className="font-semibold">Base geral</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Consulta rapida de todos os leads.
          </p>
        </div>
        <input
          className={cn(fieldInputClass, "lg:max-w-md")}
          onChange={(event) => onSearch(event.target.value)}
          placeholder="Buscar por nome, telefone ou e-mail"
          value={baseSearch}
        />
      </div>
      <div className="mt-5 overflow-x-auto">
        <table className="min-w-[900px] text-left text-sm">
          <thead className="text-xs uppercase tracking-[0.08em] text-muted-foreground">
            <tr className="border-b">
              <th className="px-3 py-3">Nome</th>
              <th className="px-3 py-3">Telefone</th>
              <th className="px-3 py-3">E-mail</th>
              <th className="px-3 py-3">Pais</th>
              <th className="px-3 py-3">Responsavel</th>
              <th className="px-3 py-3">Pipeline</th>
              <th className="px-3 py-3">Etapa</th>
              <th className="px-3 py-3">Acao</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr className="border-b last:border-b-0" key={lead.id}>
                <td className="px-3 py-3">
                  <button
                    className="font-medium text-foreground hover:text-primary"
                    onClick={() => onOpen(lead.id)}
                    type="button"
                  >
                    {lead.nome}
                  </button>
                </td>
                <td className="px-3 py-3 text-muted-foreground">
                  {lead.telefone || "-"}
                </td>
                <td className="px-3 py-3 text-muted-foreground">
                  {lead.email || "-"}
                </td>
                <td className="px-3 py-3 text-muted-foreground">
                  {lead.pais || "-"}
                </td>
                <td className="px-3 py-3 text-muted-foreground">
                  {lead.consultor || "-"}
                </td>
                <td className="px-3 py-3 text-muted-foreground">
                  {lead.pipeline}
                </td>
                <td className="px-3 py-3 text-muted-foreground">
                  {lead.etapa}
                </td>
                <td className="px-3 py-3">
                  <Button
                    onClick={() => onEdit(lead)}
                    size="sm"
                    type="button"
                    variant="secondary"
                  >
                    Editar
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function LeadForm({
  draft,
  editingLeadId,
  kanbanPipelineDefinitions,
  onCancel,
  onChange,
  onPipelineChange,
  onSubmit,
}: {
  draft: CrmLeadInput;
  editingLeadId: string | null;
  kanbanPipelineDefinitions: Array<{
    key: CrmPipeline;
    label: string;
    stages: Array<{ key: CrmStage; label: string }>;
  }>;
  onCancel: () => void;
  onChange: React.Dispatch<React.SetStateAction<CrmLeadInput>>;
  onPipelineChange: (pipeline: CrmPipeline) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <section className="executive-surface rounded-md p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold">
            {editingLeadId ? "Editar lead" : "Criar lead"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Detalhes completos ficam concentrados aqui para manter a operacao
            diaria compacta.
          </p>
        </div>
        {editingLeadId ? (
          <Button onClick={onCancel} type="button" variant="ghost">
            Cancelar
          </Button>
        ) : null}
      </div>
      <form className="mt-5 grid gap-4" onSubmit={onSubmit}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Nome">
            <input
              className={fieldInputClass}
              onChange={(event) =>
                onChange((currentDraft) => ({
                  ...currentDraft,
                  nome: event.target.value,
                }))
              }
              required
              value={draft.nome}
            />
          </Field>
          <Field label="Telefone">
            <input
              className={fieldInputClass}
              onChange={(event) =>
                onChange((currentDraft) => ({
                  ...currentDraft,
                  telefone: event.target.value,
                }))
              }
              value={draft.telefone}
            />
          </Field>
          <Field label="E-mail">
            <input
              className={fieldInputClass}
              onChange={(event) =>
                onChange((currentDraft) => ({
                  ...currentDraft,
                  email: event.target.value,
                }))
              }
              type="email"
              value={draft.email}
            />
          </Field>
          <Field label="Pais">
            <input
              className={fieldInputClass}
              onChange={(event) =>
                onChange((currentDraft) => ({
                  ...currentDraft,
                  pais: event.target.value,
                }))
              }
              value={draft.pais ?? ""}
            />
          </Field>
          <Field label="Responsavel">
            <input
              className={fieldInputClass}
              onChange={(event) =>
                onChange((currentDraft) => ({
                  ...currentDraft,
                  consultor: event.target.value,
                }))
              }
              value={draft.consultor}
            />
          </Field>
          <Field label="Valor P&S">
            <input
              className={fieldInputClass}
              min={0}
              onChange={(event) =>
                onChange((currentDraft) => ({
                  ...currentDraft,
                  valorPretendido: Number(event.target.value),
                }))
              }
              type="number"
              value={draft.valorPretendido}
            />
          </Field>
          <Field label="Temperatura">
            <select
              className={fieldInputClass}
              onChange={(event) =>
                onChange((currentDraft) => ({
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
          <Field label="Pipeline">
            <select
              className={fieldInputClass}
              onChange={(event) =>
                onPipelineChange(event.target.value as CrmPipeline)
              }
              value={draft.pipeline}
            >
              {kanbanPipelineDefinitions.map((pipeline) => (
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
                onChange((currentDraft) => ({
                  ...currentDraft,
                  etapa: event.target.value as CrmStage,
                }))
              }
              value={draft.etapa}
            >
              {getFilterStages(draft.pipeline, kanbanPipelineDefinitions).map(
                (stage) => (
                  <option key={stage.key} value={stage.key}>
                    {stage.label}
                  </option>
                ),
              )}
            </select>
          </Field>
          <Field label="Origem">
            <input
              className={fieldInputClass}
              onChange={(event) =>
                onChange((currentDraft) => ({
                  ...currentDraft,
                  origem: event.target.value,
                }))
              }
              value={draft.origem}
            />
          </Field>
          <Field label="Proxima acao">
            <input
              className={fieldInputClass}
              onChange={(event) =>
                onChange((currentDraft) => ({
                  ...currentDraft,
                  proximaAcao: event.target.value,
                }))
              }
              value={draft.proximaAcao}
            />
          </Field>
          <Field label="Data da proxima acao">
            <input
              className={fieldInputClass}
              onChange={(event) =>
                onChange((currentDraft) => ({
                  ...currentDraft,
                  dataProximaAcao: event.target.value,
                }))
              }
              type="date"
              value={draft.dataProximaAcao}
            />
          </Field>
        </div>
        <Field label="Observacoes">
          <textarea
            className={cn(fieldInputClass, "min-h-24 resize-y")}
            onChange={(event) =>
              onChange((currentDraft) => ({
                ...currentDraft,
                observacoes: event.target.value,
              }))
            }
            value={draft.observacoes}
          />
        </Field>
        <div>
          <Button type="submit">
            <Plus className="h-4 w-4" aria-hidden />
            {editingLeadId ? "Salvar lead" : "Criar lead"}
          </Button>
        </div>
      </form>
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

function TemperatureBadge({ temperature }: { temperature: CrmTemperature }) {
  return (
    <span
      className={cn(
        "rounded-full border px-2 py-0.5 text-xs font-medium",
        temperature === "quente"
          ? "border-primary/30 bg-primary/5 text-primary"
          : temperature === "fria"
            ? "text-muted-foreground"
            : "border-brand-gold/40 text-brand-ink",
      )}
    >
      {crmTemperatureLabels[temperature]}
    </span>
  );
}

function LeadLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span>{label}</span>
      <span className="truncate text-right font-medium text-foreground">
        {value}
      </span>
    </div>
  );
}

function buildMyDayGroups(leads: CrmLead[]) {
  const activeLeads = leads.filter((lead) => lead.status === "ativa");
  const hot = activeLeads.filter((lead) => lead.temperatura === "quente");
  const dueToday = activeLeads.filter((lead) =>
    isTodayOrPast(lead.dataProximaAcao),
  );
  const awaitingAction = activeLeads.filter(
    (lead) => !lead.proximaAcao && !lead.dataProximaAcao,
  );

  return {
    awaitingAction,
    dueToday,
    hot,
    total: new Set([...hot, ...dueToday, ...awaitingAction].map((lead) => lead.id)).size,
  };
}

function buildOperationalColumns({
  group,
  leads,
  pipelineDefinitions,
}: {
  group: OperationalGroup;
  leads: CrmLead[];
  pipelineDefinitions: Array<{
    key: CrmPipeline;
    label: string;
    stages: Array<{ key: CrmStage; label: string }>;
  }>;
}): OperationalColumn[] {
  const pipeline =
    findPipelineForGroup(group, pipelineDefinitions, leads) ??
    groupPipelineCandidates[group][0];
  const pipelineDefinition = pipelineDefinitions.find(
    (item) => item.key === pipeline,
  );

  return groupStages[group].map((stage) => {
    const matchedStage =
      pipelineDefinition?.stages.find((item) =>
        stage.candidates.some(
          (candidate) =>
            normalizeKey(item.key) === normalizeKey(candidate) ||
            normalizeKey(item.label) === normalizeKey(candidate),
        ),
      ) ??
      findLeadStageForGroup({
        group,
        leads,
        stageCandidates: stage.candidates,
      });

    return {
      label: stage.label,
      pipeline,
      stage: matchedStage?.key ?? stage.label,
    };
  });
}

function findPipelineForGroup(
  group: OperationalGroup,
  pipelineDefinitions: Array<{ key: CrmPipeline; label: string }>,
  leads: CrmLead[],
) {
  const candidates = groupPipelineCandidates[group].map(normalizeKey);
  const configured = pipelineDefinitions.find(
    (pipeline) =>
      candidates.includes(normalizeKey(pipeline.key)) ||
      candidates.includes(normalizeKey(pipeline.label)),
  );

  if (configured) {
    return configured.key;
  }

  return leads.find((lead) => isLeadInGroup(lead, group))?.pipeline;
}

function findLeadStageForGroup({
  group,
  leads,
  stageCandidates,
}: {
  group: OperationalGroup;
  leads: CrmLead[];
  stageCandidates: string[];
}) {
  return leads
    .filter((lead) => isLeadInGroup(lead, group))
    .map((lead) => ({ key: lead.etapa, label: lead.etapa }))
    .find((stage) =>
      stageCandidates.some(
        (candidate) => normalizeKey(stage.key) === normalizeKey(candidate),
      ),
    );
}

function isLeadInGroup(lead: CrmLead, group: OperationalGroup) {
  const candidates = groupPipelineCandidates[group].map(normalizeKey);

  return candidates.includes(normalizeKey(lead.pipeline));
}

function filterBaseLeads(leads: CrmLead[], search: string) {
  const normalizedSearch = normalizeKey(search);

  if (!normalizedSearch) {
    return leads;
  }

  return leads.filter((lead) =>
    [
      lead.nome,
      lead.telefone,
      lead.email,
      lead.pais ?? "",
      lead.consultor,
      lead.pipeline,
      lead.etapa,
    ]
      .map(normalizeKey)
      .some((value) => value.includes(normalizedSearch)),
  );
}

function getFilterStages(
  pipeline: CrmPipeline | "all",
  pipelineDefinitions: Array<{
    key: CrmPipeline;
    stages: Array<{ key: CrmStage; label: string }>;
  }>,
) {
  if (pipeline === "all") {
    return pipelineDefinitions.flatMap((item) => item.stages);
  }

  return (
    pipelineDefinitions.find((item) => item.key === pipeline)?.stages ?? []
  );
}

function isTodayOrPast(value: string) {
  if (!value) {
    return false;
  }

  const target = new Date(`${value}T00:00:00`).getTime();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return Number.isFinite(target) && target <= today.getTime();
}

function formatDate(value: string) {
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? "-" : dateOnlyFormatter.format(date);
}

function normalizeKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
