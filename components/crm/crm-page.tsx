"use client";

import {
  useEffect,
  useMemo,
  useState,
  type DragEvent,
  type FormEvent,
} from "react";
import { AlertTriangle, Clock3, Flame, Pencil, Plus } from "lucide-react";
import { AccessSettingsPage } from "@/components/access/access-settings-page";
import { CrmLeadDetail } from "@/components/crm/crm-lead-detail";
import { CrmSourceIndicator } from "@/components/crm/crm-source-indicator";
import { Button } from "@/components/ui/button";
import {
  addCrmStageToPipeline,
  buildCrmCommercialSignalSummary,
  buildCrmOperationalPrioritySummary,
  buildCrmAdvancedSearchOptions,
  crmStageLabels,
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
  resolveCrmLeadCommercialSignal,
  resolveCrmLeadOperationalPriority,
  saveCrmLead,
  summarizeCrmAdvancedSearch,
  toCrmPipelineDefinitions,
  updateCrmLead,
  updateCrmLeadInRepository,
  updateCrmPipelineName,
  updateCrmStageName,
  type CrmConfigurablePipeline,
  type CrmAdvancedSearchFilters,
  type CrmCommercialSignal,
  type CrmLead,
  type CrmLeadInput,
  type CrmOperationalPriority,
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
  group?: OperationalGroup;
  label: string;
  pipeline: CrmPipeline;
  stage: CrmStage;
  status?: CrmLead["status"];
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
const INITIAL_PIPELINE_CARDS_LIMIT = 5;

export function CrmPage({
  onGenerateSimulation,
}: {
  onGenerateSimulation?: (lead: CrmLead) => void;
  onGenerateProposal?: (lead: CrmLead) => void;
}) {
  const [activeTab, setActiveTab] = useState<CrmOperationalTab>("my-day");
  const [isAdvancedSearchOpen, setIsAdvancedSearchOpen] = useState(false);
  const [expandedPipelineColumns, setExpandedPipelineColumns] = useState<
    Record<string, boolean>
  >({});
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
      commercialSignal: "all",
      consultor: "all",
      freeText: "",
      operationalPriority: "all",
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
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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

  useEffect(() => {
    if (!successMessage) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setSuccessMessage(null);
    }, 3000);

    return () => window.clearTimeout(timeoutId);
  }, [successMessage]);

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
  const commercialSignalSummary = useMemo(
    () => buildCrmCommercialSignalSummary(filteredLeads),
    [filteredLeads],
  );
  const operationalPrioritySummary = useMemo(
    () => buildCrmOperationalPrioritySummary(filteredLeads),
    [filteredLeads],
  );
  const myDayGroups = useMemo(
    () => buildMyDayGroups(filteredLeads),
    [filteredLeads],
  );
  const focusGroups = useMemo(
    () => buildCommercialFocusGroups(filteredLeads),
    [filteredLeads],
  );
  const filteredBaseLeads = useMemo(
    () => filterBaseLeads(filteredLeads, baseSearch),
    [baseSearch, filteredLeads],
  );
  const activePipelineGroup =
    activeTab === "sales" || activeTab === "administrative"
      ? activeTab
      : activeTab === "prospecting" || activeTab === "my-day"
        ? "prospecting"
        : null;
  const shouldShowCommercialPipeline =
    activeTab === "my-day" || activeTab === "prospecting" || activeTab === "sales";
  const shouldShowOperationalSupport =
    activeTab === "my-day" ||
    activeTab === "prospecting" ||
    activeTab === "sales" ||
    activeTab === "administrative";

  if (selectedLead && activeTab !== "settings") {
    return (
      <CrmLeadDetail
        draft={draft}
        feedbackMessage={successMessage}
        lead={selectedLead}
        onCancel={() => {
          setSelectedLeadId(null);
          setDraft(emptyCrmLeadInput);
        }}
        onClearFeedbackMessage={() => setSuccessMessage(null)}
        onDraftChange={setDraft}
        onGenerateSimulation={(lead: CrmLead) => onGenerateSimulation?.(lead)}
        onSave={handleSaveSelectedLead}
        proposals={[]}
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
      console.info("[EVOLV CRM] Salvando edicao principal do lead.", {
        externalId: nextLead.externalId,
        id: editingLeadId,
      });
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

  async function handleSaveSelectedLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedLead) {
      return;
    }

    const nextLead = updateCrmLead(selectedLead, draft);
    console.info("[EVOLV CRM] Salvando dossie operacional do lead.", {
      externalId: nextLead.externalId,
      id: selectedLead.id,
    });
    const savedLead =
      (await updateCrmLeadInRepository(selectedLead.id, nextLead)) ?? nextLead;

    setLeads((currentLeads) =>
      currentLeads.map((lead) =>
        lead.id === selectedLead.id ? savedLead : lead,
      ),
    );
    setDraft(mapLeadToInput(savedLead));
    setSuccessMessage("Lead atualizado com sucesso.");
  }

  function handleEditLead(lead: CrmLead) {
    setActiveTab((currentTab) =>
      currentTab === "settings" ? "my-day" : currentTab,
    );
    setEditingLeadId(null);
    setSelectedLeadId(lead.id);
    setDraft(mapLeadToInput(lead));
  }

  function handleCancelEdit() {
    setEditingLeadId(null);
    setSelectedLeadId(null);
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

    if (!movement.changed) {
      return;
    }

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
    console.info("[EVOLV CRM] Salvando movimentacao do lead.", {
      externalId: nextLead.externalId,
      fromPipeline: movement.fromPipeline,
      fromStage: movement.fromStage,
      id: lead.id,
      toPipeline: movement.toPipeline,
      toStage: movement.toStage,
    });
    const savedLead =
      (await updateCrmLeadInRepository(lead.id, nextLead)) ?? nextLead;

    setLeads((currentLeads) =>
      currentLeads.map((currentLead) =>
        currentLead.id === lead.id ? savedLead : currentLead,
      ),
    );
    setSuccessMessage(
      crmStageLabels[movement.toStage]
        ? `Lead movido para ${crmStageLabels[movement.toStage]}.`
        : "Lead movido com sucesso.",
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

  function handleTogglePipelineColumn(columnId: string) {
    setExpandedPipelineColumns((currentColumns) => ({
      ...currentColumns,
      [columnId]: !currentColumns[columnId],
    }));
  }

  return (
    <section className="grid min-w-0 gap-4 overflow-x-hidden">
      <section className="executive-surface min-w-0 rounded-md p-5 sm:p-6">
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
          <CrmSourceIndicator />
        </div>

        <div className="mt-5 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-5 xl:grid-cols-10">
          <CrmCompactMetric label="Ativas" value={searchSummary.active} />
          <CrmCompactMetric label="Quentes" value={commercialSignalSummary.hot} />
          <CrmCompactMetric
            label="Abandonados"
            value={commercialSignalSummary.abandoned}
          />
          <CrmCompactMetric
            label="Acoes vencidas"
            value={operationalPrioritySummary.overdue}
          />
          <CrmCompactMetric
            label="Acoes hoje"
            value={operationalPrioritySummary.today}
          />
          <CrmCompactMetric
            label="Sem proxima acao"
            value={operationalPrioritySummary.missingAction}
          />
          <CrmCompactMetric label="Ganhas" value={searchSummary.gained} />
          <CrmCompactMetric label="Perdidas" value={searchSummary.lost} />
          <CrmCompactMetric
            label="Valor filtrado"
            value={currencyFormatter.format(searchSummary.totalPotential)}
          />
          <CrmCompactMetric label="Base filtrada" value={filteredLeads.length} />
        </div>

        <AdvancedSearchPanel
          filters={advancedFilters}
          isOpen={isAdvancedSearchOpen}
          onChange={setAdvancedFilters}
          onToggle={() => setIsAdvancedSearchOpen((currentValue) => !currentValue)}
          options={searchOptions}
          summary={searchSummary}
        />

        <nav className="mt-4 flex gap-2 overflow-x-auto pb-1">
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
              onClick={() => {
                setActiveTab(tab.key);

                if (tab.key === "settings") {
                  setEditingLeadId(null);
                  setSelectedLeadId(null);
                  setDraft(emptyCrmLeadInput);
                }
              }}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </section>

      {successMessage ? <SuccessFeedback message={successMessage} /> : null}

      {activePipelineGroup ? (
        <div className="grid min-w-0 gap-4 overflow-x-hidden">
          <FocusOfTheDayPanel groups={focusGroups} />
          <OperationalKanban
            columns={
              shouldShowCommercialPipeline
                ? buildCommercialPipelineColumns({
                    leads: filteredLeads,
                    pipelineDefinitions: kanbanPipelineDefinitions,
                  })
                : buildOperationalColumns({
                    group: activePipelineGroup,
                    leads: filteredLeads,
                    pipelineDefinitions: kanbanPipelineDefinitions,
                  })
            }
            dragTarget={dragTarget}
            group={activePipelineGroup}
            leads={filteredLeads}
            expandedColumnIds={expandedPipelineColumns}
            onDragEnd={handleLeadDragEnd}
            onDragOver={handleStageDragOver}
            onDragStart={handleLeadDragStart}
            onDrop={handleStageDrop}
            onEdit={handleEditLead}
            onToggleColumn={handleTogglePipelineColumn}
          />
        </div>
      ) : null}

      {shouldShowOperationalSupport ? (
        <MyDayPanel
          groups={myDayGroups}
          onEdit={handleEditLead}
          onOpen={setSelectedLeadId}
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
        <section className="grid min-w-0 gap-6">
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
  isOpen,
  onChange,
  onToggle,
  options,
  summary,
}: {
  filters: CrmAdvancedSearchFilters;
  isOpen: boolean;
  onChange: React.Dispatch<React.SetStateAction<CrmAdvancedSearchFilters>>;
  onToggle: () => void;
  options: ReturnType<typeof buildCrmAdvancedSearchOptions>;
  summary: ReturnType<typeof summarizeCrmAdvancedSearch>;
}) {
  function clearFilters() {
    onChange({
      commercialSignal: "all",
      consultor: "all",
      freeText: "",
      operationalPriority: "all",
      origem: "all",
      pipeline: "all",
      status: "all",
      temperatura: "all",
    });
  }

  return (
    <section className="mt-5 rounded-md border bg-background/72 p-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Busca Avancada
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {summary.total} registros encontrados nos filtros atuais.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={onToggle} type="button" variant="secondary">
            {isOpen ? "Recolher filtros" : "Expandir filtros"}
          </Button>
          <Button onClick={clearFilters} type="button" variant="ghost">
            Limpar filtros
          </Button>
        </div>
      </div>

      {isOpen ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-8">
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
          label="Sinal comercial"
          onChange={(value) =>
            onChange((currentFilters) => ({
              ...currentFilters,
              commercialSignal:
                value as CrmAdvancedSearchFilters["commercialSignal"],
            }))
          }
          options={[
            ["all", "Todos"],
            ["hot", "Quentes"],
            ["warm", "Mornos"],
            ["cold", "Frios"],
            ["abandoned", "Abandonados"],
            ["unknown", "Sem sinal"],
          ]}
          value={filters.commercialSignal}
        />

        <AdvancedSelect
          label="Prioridade operacional"
          onChange={(value) =>
            onChange((currentFilters) => ({
              ...currentFilters,
              operationalPriority:
                value as CrmAdvancedSearchFilters["operationalPriority"],
            }))
          }
          options={[
            ["all", "Todas"],
            ["overdue", "Acoes vencidas"],
            ["today", "Acoes hoje"],
            ["missing_action", "Sem proxima acao"],
            ["incomplete", "Planejamento incompleto"],
          ]}
          value={filters.operationalPriority}
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
      ) : null}
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
    <section className="executive-surface min-w-0 rounded-md p-5 sm:p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
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
          className="w-full sm:w-auto"
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
            className="min-w-0 rounded-md border bg-background/70 p-4"
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

            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                className={cn(fieldInputClass, "min-w-0 flex-1")}
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
                className="shrink-0"
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

function FocusOfTheDayPanel({
  groups,
}: {
  groups: ReturnType<typeof buildCommercialFocusGroups>;
}) {
  return (
    <section className="executive-surface rounded-md px-3 py-2.5 sm:px-4">
      <div className="flex flex-col gap-2 xl:flex-row xl:items-center">
        <div className="flex shrink-0 items-center gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Foco do Dia
          </p>
        </div>
        <div className="grid flex-1 gap-2 sm:grid-cols-3">
        <FocusMetricCard
          icon={<Flame className="h-4 w-4" aria-hidden />}
          leads={groups.hotWithoutAction}
          title="Quentes sem acao"
          tone="warm"
        />
        <FocusMetricCard
          icon={<AlertTriangle className="h-4 w-4" aria-hidden />}
          leads={groups.overdueActions}
          title="Acoes vencidas"
          tone="attention"
        />
        <FocusMetricCard
          icon={<Clock3 className="h-4 w-4" aria-hidden />}
          leads={groups.staleLeads}
          title="Sem movimentacao"
          tone="quiet"
        />
        </div>
      </div>
    </section>
  );
}

function FocusMetricCard({
  icon,
  leads,
  title,
  tone,
}: {
  icon: React.ReactNode;
  leads: CrmLead[];
  title: string;
  tone: "attention" | "quiet" | "warm";
}) {
  return (
    <article
      className={cn(
        "rounded-md border px-2.5 py-1.5",
        tone === "attention"
          ? "border-[#d9a184] bg-[#f5e8df]"
          : tone === "warm"
            ? "border-[#d9c28a] bg-[#f7f0df]"
            : "border-[#c8d4dc] bg-[#edf3f6]",
      )}
    >
      <div className="flex min-w-0 items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={cn(
              "shrink-0",
              tone === "attention"
                ? "text-[#9a4f32]"
                : tone === "warm"
                  ? "text-[#80662f]"
                  : "text-[#546977]",
            )}
          >
            {icon}
          </span>
          <h4 className="truncate text-xs font-semibold text-foreground">
            {title}
          </h4>
        </div>
        <span className="rounded-full border bg-background/70 px-2 py-0.5 text-xs font-semibold text-foreground">
          {leads.length}
        </span>
      </div>
    </article>
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
  expandedColumnIds,
  group,
  leads,
  onDragEnd,
  onDragOver,
  onDragStart,
  onDrop,
  onEdit,
  onToggleColumn,
}: {
  columns: OperationalColumn[];
  dragTarget: { pipeline: CrmPipeline; stage: CrmStage } | null;
  expandedColumnIds: Record<string, boolean>;
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
  onToggleColumn: (columnId: string) => void;
}) {
  return (
    <section className="executive-surface min-w-0 overflow-hidden rounded-md p-3.5 sm:p-4">
      <div className="w-full min-w-0 overflow-x-auto pb-3">
        <div className="flex w-max items-start gap-3">
          {columns.map((column) => {
          const columnId = getOperationalColumnId(column);
          const stageLeads = column.status
            ? leads.filter((lead) => lead.status === column.status)
            : leads.filter(
                (lead) =>
                  isLeadInGroup(lead, column.group ?? group) &&
                  normalizeKey(lead.etapa) === normalizeKey(column.stage),
              );
          const isExpanded = Boolean(expandedColumnIds[columnId]);
          const visibleStageLeads = isExpanded
            ? stageLeads
            : stageLeads.slice(0, INITIAL_PIPELINE_CARDS_LIMIT);
          const hasHiddenLeads =
            stageLeads.length > INITIAL_PIPELINE_CARDS_LIMIT;
          const isActiveDropTarget =
            !column.status &&
            dragTarget?.pipeline === column.pipeline &&
            dragTarget.stage === column.stage;

          return (
            <section
              className={cn(
                "w-[260px] flex-none rounded-md border bg-background/72 p-2.5 transition",
                isActiveDropTarget
                  ? "border-primary/45 bg-primary/5 shadow-sm ring-2 ring-primary/15"
                  : "border-border",
              )}
              key={columnId}
              onDragOver={(event) => {
                if (!column.status) {
                  onDragOver(event, column.pipeline, column.stage);
                }
              }}
              onDrop={(event) => {
                if (!column.status) {
                  onDrop(event, column.pipeline, column.stage);
                }
              }}
            >
              <div className="flex min-w-0 items-center justify-between gap-2">
                <h3 className="min-w-0 truncate text-sm font-semibold text-foreground">
                  {column.label}
                </h3>
                <span className="shrink-0 rounded-full border bg-card px-1.5 py-0.5 text-xs text-muted-foreground">
                  {stageLeads.length}
                </span>
              </div>
              <div className="mt-2 grid gap-1.5">
                {stageLeads.length ? (
                  visibleStageLeads.map((lead) => (
                    <CompactLeadCard
                      key={lead.id}
                      lead={lead}
                      readOnly={Boolean(column.status)}
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
                {hasHiddenLeads ? (
                  <button
                    className="mt-1 inline-flex w-fit items-center text-xs font-medium text-primary transition hover:text-primary/80"
                    onClick={() => onToggleColumn(columnId)}
                    type="button"
                  >
                    {isExpanded
                      ? "Ver menos"
                      : `Ver todos (${stageLeads.length})`}
                  </button>
                ) : null}
              </div>
            </section>
          );
          })}
        </div>
      </div>
    </section>
  );
}

function CompactLeadCard({
  lead,
  onDragEnd,
  onDragStart,
  onEdit,
  readOnly = false,
}: {
  lead: CrmLead;
  onDragEnd: () => void;
  onDragStart: (leadId: string) => void;
  onEdit: (lead: CrmLead) => void;
  readOnly?: boolean;
}) {
  const hasRelevantValue = lead.valorPretendido > 0;

  return (
    <article
      className={cn(
        "min-w-0 overflow-hidden rounded-md border bg-card px-2 py-1.5 shadow-sm transition hover:border-primary/30",
        readOnly ? "cursor-default" : "cursor-grab active:cursor-grabbing",
      )}
      draggable={!readOnly}
      onDragEnd={onDragEnd}
      onDragStart={(event) => {
        if (readOnly) {
          return;
        }

        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", lead.id);
        onDragStart(lead.id);
      }}
    >
      <div className="flex min-w-0 items-center justify-between gap-1.5 overflow-hidden">
        <h4 className="min-w-0 truncate text-sm font-semibold leading-5 text-foreground">
          {getLeadDisplayName(lead)}
        </h4>
        <div className="flex shrink-0 flex-wrap justify-end gap-1 overflow-hidden">
          <TemperatureBadge temperature={lead.temperatura} />
          <CommercialSignalBadge lead={lead} />
          <OperationalPriorityBadge lead={lead} />
        </div>
      </div>
      <div className="mt-1 grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-1.5 overflow-hidden text-xs">
        <span
          className={cn(
            "shrink-0 whitespace-nowrap",
            hasRelevantValue
              ? "font-semibold text-foreground"
              : "font-medium text-muted-foreground/70",
          )}
        >
          {currencyFormatter.format(lead.valorPretendido)}
        </span>
        <span className="min-w-0 truncate whitespace-nowrap text-right text-muted-foreground">
          {lead.proximaAcao || "-"}
        </span>
      </div>
      <div className="mt-1 flex justify-end">
        <Button
          aria-label={`Editar ${getLeadDisplayName(lead)}`}
          className="h-6 w-6 px-0"
          onClick={() => onEdit(lead)}
          size="sm"
          title="Editar"
          type="button"
          variant="ghost"
        >
          <Pencil className="h-3 w-3" aria-hidden />
        </Button>
      </div>
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
            <h4 className="truncate text-sm font-semibold">{getLeadDisplayName(lead)}</h4>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {lead.telefone || "Sem telefone"}
            </p>
          </div>
          <div className="flex flex-wrap justify-end gap-1">
            <TemperatureBadge temperature={lead.temperatura} />
            <CommercialSignalBadge lead={lead} />
            <OperationalPriorityBadge lead={lead} />
          </div>
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
    <section className="executive-surface min-w-0 rounded-md p-5 sm:p-6">
      <div className="flex flex-col gap-1">
        <h3 className="font-semibold">Perdidos</h3>
        <p className="text-sm text-muted-foreground">
          Lista de recuperacao, treinamento e reativacao de base.
        </p>
      </div>
      <div className="mt-5 min-w-0 overflow-x-auto rounded-md border bg-background/60">
        {leads.length ? (
          <table className="min-w-[860px] table-fixed text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.08em] text-muted-foreground">
              <tr className="border-b">
                <th className="w-[230px] px-3 py-3">Nome</th>
                <th className="w-[150px] px-3 py-3">Telefone</th>
                <th className="w-[190px] px-3 py-3">Motivo</th>
                <th className="w-[150px] px-3 py-3">Responsavel</th>
                <th className="w-[130px] px-3 py-3">Data da perda</th>
                <th className="w-[90px] px-3 py-3">Acao</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr className="border-b last:border-b-0" key={lead.id}>
                  <td className="truncate px-3 py-3 font-medium">
                    {getLeadDisplayName(lead)}
                  </td>
                  <td className="truncate px-3 py-3 text-muted-foreground">
                    {lead.telefone || "-"}
                  </td>
                  <td className="truncate px-3 py-3 text-muted-foreground">
                    {lead.etapa}
                  </td>
                  <td className="truncate px-3 py-3 text-muted-foreground">
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
        ) : (
          <p className="p-4 text-sm text-muted-foreground">
            Nenhum lead perdido nos filtros atuais.
          </p>
        )}
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
        <table className="min-w-[1040px] text-left text-sm">
          <thead className="text-xs uppercase tracking-[0.08em] text-muted-foreground">
            <tr className="border-b">
              <th className="px-3 py-3">Nome</th>
              <th className="px-3 py-3">Telefone</th>
              <th className="px-3 py-3">E-mail</th>
              <th className="px-3 py-3">Pais</th>
              <th className="px-3 py-3">Responsavel</th>
              <th className="px-3 py-3">Pipeline</th>
              <th className="px-3 py-3">Etapa</th>
              <th className="px-3 py-3">Sinal</th>
              <th className="px-3 py-3">Prioridade</th>
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
                    {getLeadDisplayName(lead)}
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
                  <CommercialSignalBadge lead={lead} />
                </td>
                <td className="px-3 py-3">
                  <OperationalPriorityBadge lead={lead} />
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

function mapLeadToInput(lead: CrmLead): CrmLeadInput {
  return {
    closedAt: lead.closedAt,
    email: lead.email,
    etapa: lead.etapa,
    externalId: lead.externalId,
    nome: lead.nome,
    observacoes: lead.observacoes,
    origem: lead.origem,
    pais: lead.pais ?? "",
    pipeline: lead.pipeline,
    produtoInteresse: lead.produtoInteresse,
    consultor: lead.consultor,
    status: lead.status,
    tags: lead.tags,
    telefone: lead.telefone,
    temperatura: lead.temperatura,
    tituloOportunidade: lead.tituloOportunidade,
    valorPretendido: lead.valorPretendido,
    dataProximaAcao: lead.dataProximaAcao,
    proximaAcao: lead.proximaAcao,
  };
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

function CrmCompactMetric({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-md border bg-background/60 px-3 py-2">
      <p className="text-[0.68rem] font-medium uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-semibold text-foreground">
        {value}
      </p>
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
        "rounded-full border px-1.5 py-0.5 text-[0.68rem] font-semibold leading-4",
        temperature === "quente"
          ? "border-[#d9a184] bg-[#f5e8df] text-[#9a4f32]"
          : temperature === "fria"
            ? "border-[#c8d4dc] bg-[#edf3f6] text-[#546977]"
            : "border-[#d9c28a] bg-[#f7f0df] text-[#80662f]",
      )}
    >
      {crmTemperatureLabels[temperature]}
    </span>
  );
}

function CommercialSignalBadge({ lead }: { lead: CrmLead }) {
  const signal = resolveCrmLeadCommercialSignal(lead);

  return (
    <span
      className={cn(
        "rounded-full border px-1.5 py-0.5 text-[0.68rem] font-semibold leading-4",
        getCommercialSignalClassName(signal.signal),
      )}
      title={`Sinal comercial: ${signal.label}. ${signal.summary}.`}
    >
      {signal.label}
    </span>
  );
}

function OperationalPriorityBadge({ lead }: { lead: CrmLead }) {
  const priority = resolveCrmLeadOperationalPriority(lead);

  return (
    <span
      className={cn(
        "rounded-full border px-1.5 py-0.5 text-[0.68rem] font-semibold leading-4",
        getOperationalPriorityClassName(priority.priority),
      )}
      title={`Prioridade operacional: ${priority.label}. ${priority.summary}`}
    >
      {priority.label}
    </span>
  );
}

function getCommercialSignalClassName(signal: CrmCommercialSignal) {
  if (signal === "hot") {
    return "border-[#d9a184] bg-[#f5e8df] text-[#9a4f32]";
  }

  if (signal === "warm") {
    return "border-[#d9c28a] bg-[#f7f0df] text-[#80662f]";
  }

  if (signal === "cold") {
    return "border-[#c8d4dc] bg-[#edf3f6] text-[#546977]";
  }

  if (signal === "abandoned") {
    return "border-[#d2b2b2] bg-[#f6eeee] text-[#8a4b4b]";
  }

  return "border-border bg-background text-muted-foreground";
}

function getOperationalPriorityClassName(priority: CrmOperationalPriority) {
  if (priority === "overdue") {
    return "border-[#d9a184] bg-[#f5e8df] text-[#9a4f32]";
  }

  if (priority === "today") {
    return "border-[#d9c28a] bg-[#f7f0df] text-[#80662f]";
  }

  if (
    priority === "missing_action" ||
    priority === "missing_date" ||
    priority === "missing_description"
  ) {
    return "border-[#d2b2b2] bg-[#f6eeee] text-[#8a4b4b]";
  }

  if (priority === "soon") {
    return "border-[#b7c8bd] bg-[#edf5ef] text-[#3f6d4e]";
  }

  return "border-border bg-background text-muted-foreground";
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

function buildCommercialFocusGroups(leads: CrmLead[]) {
  const activeLeads = leads.filter((lead) => lead.status === "ativa");

  return {
    hotWithoutAction: activeLeads.filter(
      (lead) => lead.temperatura === "quente" && !lead.proximaAcao.trim(),
    ),
    overdueActions: activeLeads.filter((lead) =>
      isBeforeToday(lead.dataProximaAcao),
    ),
    staleLeads: activeLeads.filter((lead) =>
      isOlderThanDays(lead.updatedAt, 14),
    ),
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
      group,
      label: stage.label,
      pipeline,
      stage: matchedStage?.key ?? stage.label,
    };
  });
}

function buildCommercialPipelineColumns({
  leads,
  pipelineDefinitions,
}: {
  leads: CrmLead[];
  pipelineDefinitions: Array<{
    key: CrmPipeline;
    label: string;
    stages: Array<{ key: CrmStage; label: string }>;
  }>;
}): OperationalColumn[] {
  const prospectingColumns = buildOperationalColumns({
    group: "prospecting",
    leads,
    pipelineDefinitions,
  });
  const salesColumns = buildOperationalColumns({
    group: "sales",
    leads,
    pipelineDefinitions,
  });

  return [
    ...prospectingColumns,
    ...salesColumns,
    {
      group: "sales",
      label: "Ganhos",
      pipeline: salesColumns[0]?.pipeline ?? "sales",
      stage: "Ganhos",
      status: "ganha",
    },
  ];
}

function getOperationalColumnId(column: OperationalColumn) {
  return [
    column.group ?? "pipeline",
    column.pipeline,
    column.stage,
    column.status ?? "active",
  ].join(":");
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
      getLeadDisplayName(lead),
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

function isBeforeToday(value: string) {
  if (!value) {
    return false;
  }

  const target = new Date(`${value}T00:00:00`).getTime();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return Number.isFinite(target) && target < today.getTime();
}

function isOlderThanDays(value: string, days: number) {
  const target = new Date(value).getTime();

  if (!Number.isFinite(target)) {
    return false;
  }

  const limit = new Date();
  limit.setHours(0, 0, 0, 0);
  limit.setDate(limit.getDate() - days);

  return target < limit.getTime();
}

function formatDate(value: string) {
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? "-" : dateOnlyFormatter.format(date);
}

function getLeadDisplayName(lead: Pick<CrmLead, "nome" | "telefone" | "email">) {
  const normalizedName =
    typeof lead.nome === "string" ? lead.nome.trim() : "";

  if (
    normalizedName &&
    normalizedName.toLowerCase() !== "undefined" &&
    normalizedName.toLowerCase() !== "null"
  ) {
    return normalizedName;
  }

  const fallbackReference = lead.telefone?.trim() || lead.email?.trim() || "";

  return fallbackReference
    ? `Lead sem nome (${fallbackReference})`
    : "Lead sem nome";
}

function SuccessFeedback({ message }: { message: string }) {
  return (
    <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
      {message}
    </p>
  );
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
