"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Copy,
  FileDown,
  FolderOpen,
  Minus,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { PortfolioIntelligencePanel } from "@/components/portfolio-intelligence/portfolio-intelligence-panel";
import { RecommendationsPanel } from "@/components/recommendations/recommendations-panel";
import { WealthEvolutionPanel } from "@/components/wealth/wealth-evolution-panel";
import {
  emptyClientContext,
  loadClientContext,
  type ClientContext,
} from "@/modules/client-context";
import {
  applyAdministratorToSimulationForm,
  buildAnchoredProposals,
  buildSimulatorCommercialPresentation,
  calculateSimulatorScenarios,
  createDefaultSavedAdministratorData,
  createEmptyCommercialData,
  createSavedAdministratorData,
  deleteSimulation,
  duplicateSimulation,
  formatSimulationDate,
  isSimulatorExampleValid,
  listAdministrators,
  loadSavedSimulations,
  resetAdministratorsDefaults,
  saveAdministrator,
  saveSimulation,
  simulatorExampleInput,
  type BidType,
  type AnchoredProposal,
  type InsuranceOption,
  type CommercialProposalEditorCalculationResult,
  type SimulatorAdministrator,
  type SimulatorCommercialPresentation,
  type SimulatorCommercialData,
  type SimulatorInput,
  type SimulatorSavedAdministratorData,
  type SimulatorSavedFormState,
  type SimulatorSavedSimulation,
  type SimulatorScenarioKey,
} from "@/modules/simulator";
import { resolveCommercialProposalProjection } from "@/modules/simulator/commercial-proposal-projection";
import {
  generateSimulatorCommercialPdf,
  type PdfCommercialConsultingConditions,
  type PdfCommercialProposalContext,
} from "@/modules/reports";
import {
  ConsultingConditionsEditor,
  initialCommercialConsultingConditions,
  type CommercialConsultingConditionsState,
} from "@/components/commercial/consulting-conditions-editor";
import {
  buildIntelligenceSummary,
  type IntelligenceSummary,
} from "@/modules/intelligence";
import {
  buildWealthEvolution,
  buildWealthJourney,
  loadWealthEvolutionInput,
  type WealthEvolutionInput,
} from "@/modules/wealth";
import {
  buildConsultativeRecommendations,
  buildRecommendationWealthInput,
  calculateRecommendationJourneySpeed,
  type Recommendation,
} from "@/modules/recommendations";
import {
  addCrmLeadSimulation,
  loadCrmLeadSimulations,
  type CrmLeadProposalContext,
} from "@/modules/crm";
import { createLeadCommercialProposal } from "@/modules/crm/client/crm-lead-commercial-proposals-client";
import {
  loadPortfolioSnapshot,
  type PortfolioSnapshot,
} from "@/modules/portfolio";
import {
  buildPortfolioIntelligence,
  type PortfolioIntelligence,
} from "@/modules/portfolio-intelligence";
import { listStrategies, type Strategy } from "@/modules/strategies";
import type { Operation, OperationDraft } from "@/modules/operations";
import { cn } from "@/lib/utils";

type SimulatorFormState = SimulatorSavedFormState;

type AnchoredPersonalizationSource = {
  proposalLabel: string;
  sourceName: string;
  sourceSimulationId: string;
};

type LeadSimulationSaveStatus = "idle" | "saving" | "success" | "error";

type LeadSimulationSaveState = {
  message: string;
  status: LeadSimulationSaveStatus;
};

type CommercialProposalSaveKind = AnchoredProposal["kind"];

type CommercialProposalSaveVariant = "suggestion" | "customized";

type CommercialProposalSaveRecord = {
  commercialProposal?: PdfCommercialProposalContext;
  kind: CommercialProposalSaveKind;
  message: string;
  proposal?: AnchoredProposal;
  proposalId: string | null;
  savedAt: string | null;
  status: Exclude<LeadSimulationSaveStatus, "idle">;
  variant: CommercialProposalSaveVariant;
};

type CommercialProposalSaveState = {
  activeKind: CommercialProposalSaveKind | null;
  records: Partial<Record<CommercialProposalSaveKind, CommercialProposalSaveRecord>>;
  status: LeadSimulationSaveStatus;
};

type CommercialConsultingConditionsByKind = Partial<
  Record<CommercialProposalSaveKind, CommercialConsultingConditionsState>
>;

type CommercialProposalEditorDraft = {
  bidType: BidType;
  contemplationMonth: string;
  credit: string;
  insuranceOption: InsuranceOption;
  lastEditedAmountField: "credit" | "targetInstallment" | null;
  scenarioKey: SimulatorScenarioKey;
  targetInstallment: string;
  termMonths: string;
};

type CommercialProposalEditorState = {
  draft: CommercialProposalEditorDraft;
  message: string;
  preview: CommercialProposalEditorCalculationResult;
  sourceProposal: AnchoredProposal;
  status: "idle" | "calculating" | "saving" | "error" | "success";
};

export type SimulatorPanelPage =
  | "simulation"
  | "results"
  | "journey"
  | "intelligence"
  | "saved"
  | "administrators"
  | "technical";

const scenarioOptions: Array<{
  key: SimulatorScenarioKey;
  label: string;
}> = [
  { key: "full", label: "Parcela cheia" },
  { key: "seventy", label: "70%" },
  { key: "half", label: "50%" },
];

const insuranceOptions: Array<{
  key: InsuranceOption;
  label: string;
}> = [
  { key: "with-insurance", label: "Com seguro" },
  { key: "without-insurance", label: "Sem seguro" },
];

const bidOptions: Array<{
  key: BidType;
  label: string;
}> = [
  { key: "none", label: "Sem lance" },
  { key: "embedded", label: "Lance embutido" },
  { key: "cash", label: "Lance em dinheiro" },
];

const initialFormState: SimulatorFormState = {
  credit: String(simulatorExampleInput.credit),
  administrativeFeePercent: percentFromRate(
    simulatorExampleInput.administrativeFeeRate,
  ),
  reserveFundPercent: percentFromRate(simulatorExampleInput.reserveFundRate),
  termMonths: String(simulatorExampleInput.termMonths),
  monthlyInsurancePercent: percentFromRate(
    simulatorExampleInput.monthlyInsuranceRate,
    4,
  ),
  inccPercent: "",
  cardSalePercent: "20",
  embeddedBidPercent: "25",
  cashBidPercent: "25",
};

const emptyWealthInput: WealthEvolutionInput = {
  currentWealth: 0,
  targetWealth: 0,
  wealthGoalTermMonths: 120,
  currentPassiveIncome: 0,
  targetPassiveIncome: 0,
  passiveIncomeGoalTermMonths: 120,
  averagePropertyValue: 0,
  averageLetterValue: 0,
};

const emptyPortfolioSnapshot: PortfolioSnapshot = {
  properties: [],
  letters: [],
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const percentFormatter = new Intl.NumberFormat("pt-BR", {
  style: "percent",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function SimulatorPanel({
  activePage = "simulation",
  operation,
  leadProposalContext,
  onOperationChange,
  onOpenSimulation,
  onClearLeadProposalContext,
}: {
  activePage?: SimulatorPanelPage;
  operation?: Operation | null;
  leadProposalContext?: CrmLeadProposalContext | null;
  onOperationChange?: (payload: {
    draft: OperationDraft;
    presentation: SimulatorCommercialPresentation;
  }) => void;
  onOpenSimulation?: () => void;
  onClearLeadProposalContext?: () => void;
}) {
  const [activeSimulationId, setActiveSimulationId] = useState<string | null>(
    null,
  );
  const [simulationName, setSimulationName] = useState("");
  const [commercialData, setCommercialData] =
    useState<SimulatorCommercialData>(() => createEmptyCommercialData());
  const [administrators, setAdministrators] = useState<
    SimulatorAdministrator[]
  >([]);
  const [selectedAdministratorId, setSelectedAdministratorId] =
    useState("custom");
  const [administratorDraft, setAdministratorDraft] =
    useState<SimulatorAdministrator | null>(null);
  const [isAdministratorEditorOpen, setIsAdministratorEditorOpen] =
    useState(false);
  const [savedSimulations, setSavedSimulations] = useState<
    SimulatorSavedSimulation[]
  >([]);
  const [clientContext, setClientContext] =
    useState<ClientContext>(emptyClientContext);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [wealthInput, setWealthInput] =
    useState<WealthEvolutionInput>(emptyWealthInput);
  const [portfolioSnapshot, setPortfolioSnapshot] =
    useState<PortfolioSnapshot>(emptyPortfolioSnapshot);
  const [selectedScenarioKey, setSelectedScenarioKey] =
    useState<SimulatorScenarioKey>("full");
  const [insuranceOption, setInsuranceOption] =
    useState<InsuranceOption>("with-insurance");
  const [bidType, setBidType] = useState<BidType>("none");
  const [isTechnicalDataOpen, setIsTechnicalDataOpen] = useState(false);
  const [contemplationMonth, setContemplationMonth] = useState(1);
  const [comfortableInstallment, setComfortableInstallment] = useState("");
  const [leadSimulationSaveState, setLeadSimulationSaveState] =
    useState<LeadSimulationSaveState>({
      message: "",
      status: "idle",
    });
  const [commercialProposalSaveState, setCommercialProposalSaveState] =
    useState<CommercialProposalSaveState>({
      activeKind: null,
      records: {},
      status: "idle",
    });
  const [
    commercialConsultingConditionsByKind,
    setCommercialConsultingConditionsByKind,
  ] = useState<CommercialConsultingConditionsByKind>({});
  const [commercialProposalEditor, setCommercialProposalEditor] =
    useState<CommercialProposalEditorState | null>(null);
  const [anchoredProposals, setAnchoredProposals] = useState<
    AnchoredProposal[]
  >([]);
  const [personalizationSource, setPersonalizationSource] =
    useState<AnchoredPersonalizationSource | null>(null);
  const [formState, setFormState] =
    useState<SimulatorFormState>(initialFormState);
  const appliedOperationIdRef = useRef<string | null>(null);
  const appliedLeadCreditContextRef = useRef<string | null>(null);
  const lastOperationSignatureRef = useRef<string>("");

  const simulatorInput = useMemo(
    () => toSimulatorInput(formState),
    [formState],
  );
  const calculation = useMemo(
    () => calculateSimulatorScenarios(simulatorInput),
    [simulatorInput],
  );
  const presentation = useMemo(
    () =>
      buildSimulatorCommercialPresentation({
        calculation,
        input: simulatorInput,
        selectedScenarioKey,
        insuranceOption,
        bidType,
        contemplationMonth,
      }),
    [
      bidType,
      calculation,
      contemplationMonth,
      insuranceOption,
      selectedScenarioKey,
      simulatorInput,
    ],
  );
  const activeSavedSimulation = useMemo(
    () =>
      savedSimulations.find(
        (simulation) => simulation.id === activeSimulationId,
      ),
    [activeSimulationId, savedSimulations],
  );
  const selectedAdministrator = useMemo(
    () =>
      administratorDraft ??
      administrators.find(
        (administrator) => administrator.id === selectedAdministratorId,
      ) ??
      null,
    [administratorDraft, administrators, selectedAdministratorId],
  );
  const intelligenceSummary = useMemo(
    () =>
      buildIntelligenceSummary({
        presentation,
        selectedScenarioKey,
        administratorInsuranceRequired: Boolean(
          selectedAdministrator?.insuranceRequired,
        ),
        bidType,
        embeddedBidRate: simulatorInput.embeddedBidRate ?? 0,
        cashBidRate: simulatorInput.cashBidRate ?? 0,
      }),
    [
      bidType,
      presentation,
      selectedAdministrator?.insuranceRequired,
      selectedScenarioKey,
      simulatorInput.cashBidRate,
      simulatorInput.embeddedBidRate,
    ],
  );
  const recommendationWealthInput = useMemo(
    () => buildRecommendationWealthInput({ clientContext, wealthInput }),
    [clientContext, wealthInput],
  );
  const recommendationWealthEvolution = useMemo(
    () => buildWealthEvolution(recommendationWealthInput),
    [recommendationWealthInput],
  );
  const recommendationWealthJourney = useMemo(
    () =>
      buildWealthJourney({
        evolution: recommendationWealthEvolution,
        input: recommendationWealthInput,
      }),
    [recommendationWealthEvolution, recommendationWealthInput],
  );
  const recommendationJourneySpeed = useMemo(
    () =>
      calculateRecommendationJourneySpeed({
        missingWealth: recommendationWealthJourney.missingWealth,
        termMonths: recommendationWealthEvolution.wealth.termMonths,
      }),
    [recommendationWealthEvolution.wealth.termMonths, recommendationWealthJourney],
  );
  const consultativeRecommendations = useMemo(
    () =>
      buildConsultativeRecommendations({
        clientContext,
        activeStrategy: strategies[0] ?? null,
        latestSimulation: savedSimulations[0] ?? null,
        wealthJourney: recommendationWealthJourney,
        wealthProgress: recommendationWealthEvolution.wealth,
        passiveIncomeProgress: recommendationWealthEvolution.passiveIncome,
        journeySpeed: recommendationJourneySpeed,
      }),
    [
      clientContext,
      recommendationJourneySpeed,
      recommendationWealthEvolution.passiveIncome,
      recommendationWealthEvolution.wealth,
      recommendationWealthJourney,
      savedSimulations,
      strategies,
    ],
  );
  const portfolioIntelligence = useMemo(
    () =>
      buildPortfolioIntelligence({
        snapshot: portfolioSnapshot,
        wealthCompletionRate: recommendationWealthEvolution.wealth.completionRate,
      }),
    [portfolioSnapshot, recommendationWealthEvolution.wealth.completionRate],
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSavedSimulations(loadSavedSimulations());
      setClientContext(loadClientContext());
      setStrategies(listStrategies());
      setWealthInput(loadWealthEvolutionInput());
      setPortfolioSnapshot(loadPortfolioSnapshot());
      const storedAdministrators = listAdministrators();
      const selectedAdministratorRecord =
        storedAdministrators.find(
          (administrator) => administrator.id === "custom",
        ) ?? storedAdministrators[0];

      setAdministrators(storedAdministrators);
      setAdministratorDraft(selectedAdministratorRecord ?? null);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (!operation || appliedOperationIdRef.current === operation.id) {
      return;
    }

    appliedOperationIdRef.current = operation.id;
    setActiveSimulationId(null);
    setSimulationName(operation.nome);
    setCommercialData(operation.commercialData);
    setSelectedAdministratorId(
      operation.administratorData.selectedAdministratorId,
    );
    setAdministratorDraft(toAdministratorFromSavedData(operation));
    setFormState(operation.formState);
    setSelectedScenarioKey(operation.selectedScenarioKey);
    setInsuranceOption(
      operation.administratorData.insuranceRequired
        ? "with-insurance"
        : operation.insuranceOption,
    );
    setContemplationMonth(operation.contemplationMonth);
    setBidType(operation.bidType);
  }, [operation]);

  useEffect(() => {
    if (!leadProposalContext) {
      appliedLeadCreditContextRef.current = null;
      return;
    }

    const leadName = normalizeOptionalText(leadProposalContext.leadName);
    const desiredCredit = leadProposalContext.leadDesiredCredit;
    const contextSignature = `${leadProposalContext.leadId}:${leadProposalContext.createdAt}`;

    if (leadName) {
      setCommercialData((currentCommercialData) =>
        currentCommercialData.clientName === leadName
          ? currentCommercialData
          : {
              ...currentCommercialData,
              clientName: leadName,
            },
      );
    }

    if (
      appliedLeadCreditContextRef.current === contextSignature ||
      typeof desiredCredit !== "number" ||
      !Number.isFinite(desiredCredit) ||
      desiredCredit <= 0
    ) {
      return;
    }

    appliedLeadCreditContextRef.current = contextSignature;
    setAnchoredProposals([]);
    setFormState((currentFormState) => ({
      ...currentFormState,
      credit: String(desiredCredit),
    }));
  }, [
    leadProposalContext,
    leadProposalContext?.createdAt,
    leadProposalContext?.leadDesiredCredit,
    leadProposalContext?.leadId,
  ]);

  useEffect(() => {
    if (!onOperationChange) {
      return;
    }

    const draft: OperationDraft = {
        id: operation?.id ?? null,
        nome: simulationName || operation?.nome || "Operacao 1",
        formState,
        commercialData,
        administratorData: selectedAdministrator
          ? createSavedAdministratorData(selectedAdministrator)
          : operation?.administratorData ?? createDefaultSavedAdministratorData(),
        selectedScenarioKey,
        insuranceOption,
        contemplationMonth: presentation.contemplationMonth,
        bidType,
        status: operation?.status ?? "active",
        tipoOperacao: operation?.tipoOperacao ?? "consortium",
        createdAt: operation?.createdAt,
      };
    const operationSignature = JSON.stringify({
      draft,
      snapshot: {
        cenario: presentation.selectedScenarioName,
        contemplacao: presentation.contemplationMonth,
        parcela: presentation.installmentBeforeContemplation,
        posContemplacao: presentation.installmentAfterContemplation,
        lucro: presentation.estimatedCardSaleProfit,
        ganho: presentation.estimatedCardSaleGainRate,
        alavancagem: presentation.leverageMultiple,
      },
    });

    if (lastOperationSignatureRef.current === operationSignature) {
      return;
    }

    lastOperationSignatureRef.current = operationSignature;
    onOperationChange({
      draft,
      presentation,
    });
  }, [
    bidType,
    commercialData,
    formState,
    insuranceOption,
    onOperationChange,
    operation?.administratorData,
    operation?.createdAt,
    operation?.id,
    operation?.nome,
    operation?.status,
    operation?.tipoOperacao,
    presentation,
    selectedAdministrator,
    selectedScenarioKey,
    simulationName,
  ]);

  useEffect(() => {
    if (!commercialProposalEditor) {
      return;
    }

    const abortController = new AbortController();
    const requestedDraft = commercialProposalEditor.draft;
    const sourceProposalKind = commercialProposalEditor.sourceProposal.kind;
    const timeoutId = window.setTimeout(async () => {
      try {
        const editorRequest = buildCommercialProposalEditorRequest(
          commercialProposalEditor,
        );

        if (!editorRequest.ok) {
          setCommercialProposalEditor((current) =>
            current?.draft === requestedDraft
              ? {
                  ...current,
                  message: editorRequest.message,
                  status: "error",
                }
              : current,
          );
          return;
        }

        const preview = await fetchCommercialProposalPreview(
          editorRequest.input,
          abortController.signal,
        );

        setCommercialProposalEditor((current) =>
          current?.draft === requestedDraft &&
          current.sourceProposal.kind === sourceProposalKind
            ? {
                ...current,
                draft: synchronizeCommercialProposalEditorDraftWithPreview(
                  current.draft,
                  preview,
                ),
                message: "Previa recalculada pelo simulador.",
                preview,
                status: "idle",
              }
            : current,
        );
      } catch (error) {
        if (abortController.signal.aborted) {
          return;
        }

        setCommercialProposalEditor((current) =>
          current?.draft === requestedDraft
            ? {
                ...current,
                message:
                  error instanceof Error
                    ? error.message
                    : "Nao foi possivel recalcular a proposta.",
                status: "error",
              }
            : current,
        );
      }
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
      abortController.abort();
    };
  }, [commercialProposalEditor?.draft]);

  return (
    <section className="flex flex-col gap-6">
      {activePage === "simulation" ? (
        <SimulationOperationPanel
          activeSimulationId={activeSimulationId}
          bidType={bidType}
          commercialData={commercialData}
          commercialConsultingConditionsByKind={
            commercialConsultingConditionsByKind
          }
          formState={formState}
          insuranceOption={insuranceOption}
          intelligenceSummary={intelligenceSummary}
          presentation={presentation}
          selectedScenarioKey={selectedScenarioKey}
          simulationName={simulationName}
          simulatorInput={simulatorInput}
          anchoredProposals={anchoredProposals}
          comfortableInstallment={comfortableInstallment}
          isTechnicalDataOpen={isTechnicalDataOpen}
          leadProposalContext={leadProposalContext}
          leadSimulationSaveState={leadSimulationSaveState}
          commercialProposalSaveState={commercialProposalSaveState}
          personalizationSource={personalizationSource}
          onCommercialDataChange={updateCommercialData}
          onCommercialConsultingConditionsChange={
            updateCommercialConsultingConditions
          }
          onContemplationMonthChange={updateContemplationMonth}
          onFormStateChange={updateFormState}
          onCustomizeAnchoredProposal={handleCustomizeAnchoredProposal}
          onGenerateAnchoredProposals={handleGenerateAnchoredProposals}
          onGenerateAnchoredProposalPdf={handleGenerateAnchoredProposalPdf}
          onGeneratePdf={handleGeneratePdf}
          onInsuranceOptionChange={handleSelectInsuranceOption}
          onSaveLeadSimulation={handleSaveLeadSimulation}
          onSaveSimulation={handleSaveSimulation}
          onScenarioChange={setSelectedScenarioKey}
          onSetComfortableInstallment={setComfortableInstallment}
          onSetBidType={handleSetBidType}
          onSetSimulationName={setSimulationName}
          onToggleTechnicalData={() =>
            setIsTechnicalDataOpen((currentValue) => !currentValue)
          }
          onClearLeadProposalContext={onClearLeadProposalContext}
          isInsuranceOptionDisabled={isInsuranceOptionDisabled}
        />
      ) : null}

      {activePage === "results" ? (
        <SimulationResults presentation={presentation} />
      ) : null}

      {activePage === "journey" ? <WealthEvolutionPanel /> : null}

      {activePage === "intelligence" ? (
        <IntelligenceSummaryPanel
          portfolioIntelligence={portfolioIntelligence}
          recommendations={consultativeRecommendations}
          summary={intelligenceSummary}
        />
      ) : null}

      {activePage === "saved" ? (
        <SavedSimulationsPanel
          activeSimulationId={activeSimulationId}
          savedSimulations={savedSimulations}
          onDelete={handleDeleteSimulation}
          onDuplicate={handleDuplicateSimulation}
          onOpen={handleOpenSimulation}
        />
      ) : null}

      {activePage === "technical" ? (
        <TechnicalSettingsPanel
          formState={formState}
          onChange={updateFormState}
        />
      ) : null}

      {activePage === "administrators" ? (
        <AdministratorSection
          administratorDraft={administratorDraft}
          administrators={administrators}
          isAdministratorEditorOpen={isAdministratorEditorOpen}
          selectedAdministrator={selectedAdministrator}
          selectedAdministratorId={selectedAdministratorId}
          onResetAdministrators={handleResetAdministrators}
          onSaveAdministratorDraft={handleSaveAdministratorDraft}
          onSelectAdministrator={handleSelectAdministrator}
          onSetAdministratorDraft={updateAdministratorDraft}
          onSetAdministratorDraftParameter={updateAdministratorDraftParameter}
          onToggleAdministratorEditor={() =>
            setIsAdministratorEditorOpen((current) => !current)
          }
        />
      ) : null}

      {commercialProposalEditor ? (
        <CommercialProposalEditorDrawer
          editor={commercialProposalEditor}
          onChangeDraft={updateCommercialProposalEditorDraft}
          onClose={() => setCommercialProposalEditor(null)}
          onSave={handleSaveEditedCommercialProposal}
        />
      ) : null}
    </section>
  );

  function updateFormState(partialState: Partial<SimulatorFormState>) {
    setAnchoredProposals([]);
    setFormState((current) => ({ ...current, ...partialState }));
  }

  function updateCommercialData(partialState: Partial<SimulatorCommercialData>) {
    setCommercialData((current) => ({ ...current, ...partialState }));
  }

  function updateCommercialConsultingConditions(
    kind: CommercialProposalSaveKind,
    partialState: Partial<CommercialConsultingConditionsState>,
  ) {
    setCommercialConsultingConditionsByKind((current) => ({
      ...current,
      [kind]: {
        ...initialCommercialConsultingConditions,
        ...(current[kind] ?? {}),
        ...partialState,
      },
    }));
  }

  function getCommercialConsultingConditions(
    kind: CommercialProposalSaveKind,
  ): CommercialConsultingConditionsState {
    return (
      commercialConsultingConditionsByKind[kind] ??
      initialCommercialConsultingConditions
    );
  }

  function updateAdministratorDraft(
    partialState: Partial<SimulatorAdministrator>,
  ) {
    setAdministratorDraft((current) =>
      current ? { ...current, ...partialState } : current,
    );
  }

  function updateAdministratorDraftParameter(
    partialParameters: Partial<SimulatorAdministrator["parameters"]>,
  ) {
    setAdministratorDraft((current) =>
      current
        ? {
            ...current,
            parameters: {
              ...current.parameters,
              ...partialParameters,
            },
          }
        : current,
    );
  }

  function updateContemplationMonth(nextMonth: number) {
    setAnchoredProposals([]);
    setContemplationMonth(
      Math.min(Math.max(1, Math.trunc(nextMonth)), simulatorInput.termMonths),
    );
  }

  function handleGeneratePdf() {
    const commercialProposal = resolveActivePdfCommercialProposal(
      commercialProposalSaveState,
    );
    const activeProposalKind = commercialProposalSaveState.activeKind;
    const commercialConsultingConditionsPayload =
      activeProposalKind !== null
        ? toPdfCommercialConsultingConditions(
            getCommercialConsultingConditions(activeProposalKind),
          )
        : null;

    generateSimulatorCommercialPdf({
      presentation,
      simulationName,
      commercialData,
      commercialConsultingConditions: commercialConsultingConditionsPayload,
      commercialProposal,
      intelligenceSummary,
      wealthJourney: getCurrentWealthJourney(),
      simulationDate:
        activeSavedSimulation?.updatedAt ?? new Date().toISOString(),
    });
  }

  function handleSaveSimulation() {
    const administratorData = selectedAdministrator
      ? createSavedAdministratorData(selectedAdministrator)
      : createDefaultSavedAdministratorData();
    const shouldCreateNewProposal = Boolean(personalizationSource);
    const savedSimulation = saveSimulation({
      id: shouldCreateNewProposal ? null : activeSimulationId,
      draft: {
        name: simulationName,
        formState,
        commercialData,
        administratorData,
        selectedScenarioKey,
        insuranceOption,
        contemplationMonth: presentation.contemplationMonth,
        bidType,
        sourceSimulationId: personalizationSource?.sourceSimulationId,
        sourceProposalLabel: personalizationSource?.proposalLabel,
      },
      presentation,
    });

    setActiveSimulationId(savedSimulation.id);
    setSimulationName(savedSimulation.name);
    setCommercialData(savedSimulation.commercialData);
    setSelectedAdministratorId(
      savedSimulation.administratorData.selectedAdministratorId,
    );
    setAdministratorDraft(toAdministratorFromSavedData(savedSimulation));
    setPersonalizationSource(null);
    setSavedSimulations(loadSavedSimulations());
    linkSimulationToLeadContext(savedSimulation);
  }

  async function handleSaveLeadSimulation() {
    if (!leadProposalContext?.leadId) {
      setLeadSimulationSaveState({
        message: "Abra a simulacao a partir de um lead antes de salvar.",
        status: "error",
      });
      return;
    }

    setLeadSimulationSaveState({
      message: "Salvando simulacao no lead...",
      status: "saving",
    });

    const accessToken = await readSupabaseAccessToken();

    if (!accessToken) {
      setLeadSimulationSaveState({
        message: "Sessao Supabase indisponivel. Faca login novamente.",
        status: "error",
      });
      return;
    }

    const payload = buildLeadSimulationApiPayload({
      bidType,
      calculation,
      commercialData,
      formState,
      insuranceOption,
      leadProposalContext,
      presentation,
      selectedAdministrator,
      selectedScenarioKey,
      simulationName,
      simulatorInput,
    });

    try {
      const response = await fetch("/api/crm/lead-simulations", {
        body: JSON.stringify(payload),
        headers: {
          authorization: `Bearer ${accessToken}`,
          "content-type": "application/json",
        },
        method: "POST",
      });
      const body = (await response.json().catch(() => null)) as {
        error?: string;
        simulation?: { id?: string };
      } | null;

      if (!response.ok) {
        throw new Error(body?.error ?? "Nao foi possivel salvar a simulacao.");
      }

      setLeadSimulationSaveState({
        message: body?.simulation?.id
          ? `Simulacao salva no lead. ID: ${body.simulation.id}`
          : "Simulacao salva no lead.",
        status: "success",
      });
    } catch (error) {
      setLeadSimulationSaveState({
        message:
          error instanceof Error
            ? error.message
            : "Nao foi possivel salvar a simulacao.",
        status: "error",
      });
    }
  }

  function handleGenerateAnchoredProposals() {
    const referenceInstallment = parseCurrencyNumber(comfortableInstallment);

    setPersonalizationSource(null);
    setCommercialProposalSaveState({
      activeKind: null,
      records: {},
      status: "idle",
    });
    setCommercialConsultingConditionsByKind({});
    setAnchoredProposals(
      buildAnchoredProposals({
        referenceInstallment,
        calculation,
        input: simulatorInput,
        insuranceOption,
        bidType,
        contemplationMonth: presentation.contemplationMonth,
        selectedScenarioKey,
      }),
    );
  }

  async function saveAnchoredProposalForPdf(
    proposal: AnchoredProposal,
  ): Promise<CommercialProposalSaveRecord | null> {
    if (!leadProposalContext?.leadId) {
      setCommercialProposalSaveRecord({
        kind: proposal.kind,
        message: "Abra a proposta a partir de um lead antes de gerar o PDF.",
        proposalId: null,
        savedAt: null,
        status: "error",
        variant: "suggestion",
      });
      return null;
    }

    if (commercialProposalSaveState.status === "saving") {
      return null;
    }

    setCommercialProposalSaveRecord({
      kind: proposal.kind,
      message: "Salvando proposta no lead...",
      proposalId: null,
      savedAt: null,
      status: "saving",
      variant: "suggestion",
    });

    const accessToken = await readSupabaseAccessToken();

    if (!accessToken) {
      setCommercialProposalSaveRecord({
        kind: proposal.kind,
        message: "Sessao Supabase indisponivel. Faca login novamente.",
        proposalId: null,
        savedAt: null,
        status: "error",
        variant: "suggestion",
      });
      return null;
    }

    try {
      const title = buildAnchoredProposalName(simulationName, proposal.label);
      const linkedSimulationId = await persistLeadSimulationForProposal({
        accessToken,
        bidType,
        commercialData,
        formState,
        insuranceOption,
        leadProposalContext,
        proposal,
        selectedAdministrator,
        title,
      });

      const createdProposal = await createLeadCommercialProposal(accessToken, {
        leadId: leadProposalContext.leadId,
        metadata: {
          savedFrom: "simulator_anchored_proposal",
          simulatorContextIntent: leadProposalContext.intent,
        },
        originalSnapshot: buildAnchoredProposalSnapshot({
          bidType,
          commercialConsultingConditions:
            getCommercialConsultingConditions(proposal.kind),
          commercialData,
          formState,
          insuranceOption,
          leadProposalContext,
          proposal,
          selectedAdministrator,
        }),
        savedSnapshot: buildAnchoredProposalSnapshot({
          bidType,
          commercialConsultingConditions:
            getCommercialConsultingConditions(proposal.kind),
          commercialData,
          formState,
          insuranceOption,
          leadProposalContext,
          proposal,
          selectedAdministrator,
        }),
        simulationId: linkedSimulationId,
        sourceSuggestion: proposal.kind,
        summary: buildAnchoredProposalSummary(proposal),
        title,
      });

      const savedSimulation = persistAnchoredProposal(proposal);

      setSavedSimulations(loadSavedSimulations());
      setSimulationName((currentName) => currentName || savedSimulation.name);
      linkSimulationToLeadContext(savedSimulation);
      const saveRecord: CommercialProposalSaveRecord = {
        commercialProposal: buildPdfCommercialProposalContext({
          commercialData,
          proposal,
          proposalId: createdProposal.id,
          title,
          variant: "suggestion",
        }),
        kind: proposal.kind,
        message: "Proposta salva no Lead. PDF gerado.",
        proposal,
        proposalId: createdProposal.id,
        savedAt: createdProposal.createdAt,
        status: "success",
        variant: "suggestion",
      };
      setCommercialProposalSaveRecord(saveRecord);
      return saveRecord;
    } catch (error) {
      setCommercialProposalSaveRecord({
        kind: proposal.kind,
        message:
          error instanceof Error
            ? error.message
            : "Nao foi possivel salvar a proposta comercial.",
        proposalId: null,
        savedAt: null,
        status: "error",
        variant: "suggestion",
      });
      return null;
    }
  }

  async function handleGenerateAnchoredProposalPdf(proposal: AnchoredProposal) {
    const existingRecord = commercialProposalSaveState.records[proposal.kind];
    const saveRecord =
      existingRecord?.status === "success"
        ? existingRecord
        : await saveAnchoredProposalForPdf(proposal);

    if (!saveRecord || saveRecord.status !== "success") {
      return;
    }

    const proposalForPdf = saveRecord.proposal ?? proposal;
    const proposalCommercialData = {
      ...commercialData,
      commercialNotes:
        saveRecord.commercialProposal?.recommendation ??
        commercialData.commercialNotes,
    };

    generateSimulatorCommercialPdf({
      presentation: proposalForPdf.presentation,
      simulationName:
        saveRecord.commercialProposal?.title ??
        buildAnchoredProposalName(simulationName, proposalForPdf.label),
      commercialData: proposalCommercialData,
      commercialConsultingConditions: toPdfCommercialConsultingConditions(
        getCommercialConsultingConditions(proposal.kind),
      ),
      commercialProposal:
        saveRecord.commercialProposal ??
        buildPdfCommercialProposalContext({
          commercialData: proposalCommercialData,
          proposal: proposalForPdf,
          proposalId: saveRecord.proposalId ?? "",
          title: buildAnchoredProposalName(
            simulationName,
            proposalForPdf.label,
          ),
          variant: saveRecord.variant,
        }),
      intelligenceSummary: buildIntelligenceSummary({
        presentation: proposalForPdf.presentation,
        selectedScenarioKey: proposalForPdf.scenarioKey,
        administratorInsuranceRequired: Boolean(
          selectedAdministrator?.insuranceRequired,
        ),
        bidType: proposalForPdf.presentation.bidType,
        embeddedBidRate: proposalForPdf.input.embeddedBidRate ?? 0,
        cashBidRate: proposalForPdf.input.cashBidRate ?? 0,
      }),
      wealthJourney: getCurrentWealthJourney(),
      simulationDate: saveRecord.savedAt ?? new Date().toISOString(),
    });
  }

  function setCommercialProposalSaveRecord(
    record: CommercialProposalSaveRecord,
  ) {
    setCommercialProposalSaveState((currentState) => ({
      activeKind: record.kind,
      records: {
        ...currentState.records,
        [record.kind]: record,
      },
      status: record.status,
    }));
  }

  function handleCustomizeAnchoredProposal(proposal: AnchoredProposal) {
    setCommercialProposalEditor(createCommercialProposalEditorState(proposal));
  }

  function updateCommercialProposalEditorDraft(
    partialDraft: Partial<CommercialProposalEditorDraft>,
  ) {
    setCommercialProposalEditor((current) =>
      current
        ? {
            ...current,
            message: "Recalculando pelo simulador...",
            draft: {
              ...current.draft,
              ...partialDraft,
            },
            status: "calculating",
          }
        : current,
    );
  }

  async function handleSaveEditedCommercialProposal() {
    if (!commercialProposalEditor || !leadProposalContext?.leadId) {
      if (commercialProposalEditor) {
        setCommercialProposalSaveRecord({
          kind: commercialProposalEditor.sourceProposal.kind,
          message: "Abra a proposta a partir de um lead antes de salvar.",
          proposalId: null,
          savedAt: null,
          status: "error",
          variant: "customized",
        });
      }
      return;
    }

    if (commercialProposalEditor.status !== "idle") {
      setCommercialProposalEditor((current) =>
        current
          ? {
              ...current,
              message:
                current.status === "error"
                  ? "Corrija os parametros antes de salvar."
                  : "Aguarde a previa recalculada antes de salvar.",
            }
          : current,
      );
      return;
    }

    setCommercialProposalEditor((current) =>
      current
        ? {
            ...current,
            message: "Salvando proposta personalizada...",
            status: "saving",
          }
        : current,
    );

    const accessToken = await readSupabaseAccessToken();

    if (!accessToken) {
      setCommercialProposalEditor((current) =>
        current
          ? {
              ...current,
              message: "Sessao Supabase indisponivel. Faca login novamente.",
              status: "error",
            }
          : current,
      );
      return;
    }

    try {
      const sourceProposal = commercialProposalEditor.sourceProposal;
      const savedProposal = buildEditedAnchoredProposal({
        preview: commercialProposalEditor.preview,
        sourceProposal,
      });
      const title = `${buildAnchoredProposalName(
        simulationName,
        sourceProposal.label,
      )} - Personalizada`;
      const linkedSimulationId = await persistLeadSimulationForProposal({
        accessToken,
        bidType: savedProposal.presentation.bidType,
        commercialData,
        formState,
        insuranceOption: commercialProposalEditor.draft.insuranceOption,
        leadProposalContext,
        proposal: savedProposal,
        selectedAdministrator,
        title,
      });

      const createdProposal = await createLeadCommercialProposal(accessToken, {
        leadId: leadProposalContext.leadId,
        metadata: {
          savedFrom: "commercial_proposal_editor",
          simulatorContextIntent: leadProposalContext.intent,
        },
        originalSnapshot: buildAnchoredProposalSnapshot({
          bidType,
          commercialConsultingConditions: getCommercialConsultingConditions(
            sourceProposal.kind,
          ),
          commercialData,
          formState,
          insuranceOption,
          leadProposalContext,
          proposal: sourceProposal,
          selectedAdministrator,
        }),
        savedSnapshot: buildAnchoredProposalSnapshot({
          bidType: savedProposal.presentation.bidType,
          commercialConsultingConditions: getCommercialConsultingConditions(
            sourceProposal.kind,
          ),
          commercialData,
          formState,
          insuranceOption: commercialProposalEditor.draft.insuranceOption,
          leadProposalContext,
          proposal: savedProposal,
          selectedAdministrator,
        }),
        simulationId: linkedSimulationId,
        sourceSuggestion: sourceProposal.kind,
        summary: buildAnchoredProposalSummary(savedProposal),
        title,
      });

      setCommercialProposalSaveRecord({
        commercialProposal: buildPdfCommercialProposalContext({
          commercialData,
          proposal: savedProposal,
          proposalId: createdProposal.id,
          title,
          variant: "customized",
        }),
        kind: sourceProposal.kind,
        message: "Versao personalizada salva no Lead.",
        proposal: savedProposal,
        proposalId: createdProposal.id,
        savedAt: createdProposal.createdAt,
        status: "success",
        variant: "customized",
      });
      setCommercialProposalEditor(null);
    } catch (error) {
      setCommercialProposalEditor((current) =>
        current
          ? {
              ...current,
              message:
                error instanceof Error
                  ? error.message
                  : "Nao foi possivel salvar a proposta personalizada.",
              status: "error",
            }
          : current,
      );
    }
  }

  function persistAnchoredProposal(proposal: AnchoredProposal) {
    const administratorData = selectedAdministrator
      ? createSavedAdministratorData(selectedAdministrator)
      : createDefaultSavedAdministratorData();

    return saveSimulation({
      id: null,
      draft: {
        name: buildAnchoredProposalName(simulationName, proposal.label),
        formState: {
          ...formState,
          credit: String(proposal.input.credit),
        },
        commercialData,
        administratorData,
        selectedScenarioKey: proposal.scenarioKey,
        insuranceOption,
        contemplationMonth: proposal.presentation.contemplationMonth,
        bidType,
      },
      presentation: proposal.presentation,
    });
  }

  function linkSimulationToLeadContext(simulation: SimulatorSavedSimulation) {
    if (!leadProposalContext) {
      return;
    }

    const existingRecord = loadCrmLeadSimulations(
      leadProposalContext.leadId,
    ).find((record) => record.simulationId === simulation.id);

    if (existingRecord) {
      return;
    }

    addCrmLeadSimulation({
      leadId: leadProposalContext.leadId,
      notes: "Proposta gerada a partir do dossie do lead.",
      simulation,
      status: "apresentada",
    });
  }

  function handleOpenSimulation(simulation: SimulatorSavedSimulation) {
    setActiveSimulationId(simulation.id);
    setSimulationName(simulation.name);
    setCommercialData(simulation.commercialData);
    setSelectedAdministratorId(
      simulation.administratorData.selectedAdministratorId,
    );
    setAdministratorDraft(toAdministratorFromSavedData(simulation));
    setFormState(simulation.formState);
    setSelectedScenarioKey(simulation.selectedScenarioKey);
    setInsuranceOption(
      simulation.administratorData.insuranceRequired
        ? "with-insurance"
        : simulation.insuranceOption,
    );
    setContemplationMonth(simulation.contemplationMonth);
    setBidType(simulation.bidType);
    setPersonalizationSource(null);
    setAnchoredProposals([]);
    onOpenSimulation?.();
  }

  function handleSelectAdministrator(administratorId: string) {
    const administrator = administrators.find(
      (currentAdministrator) => currentAdministrator.id === administratorId,
    );

    if (!administrator) {
      return;
    }

    setSelectedAdministratorId(administrator.id);
    setAdministratorDraft(administrator);
    setAnchoredProposals([]);
    setFormState((currentFormState) =>
      applyAdministratorToSimulationForm(currentFormState, administrator),
    );

    if (administrator.insuranceRequired) {
      setInsuranceOption("with-insurance");
    }
  }

  function handleSaveAdministratorDraft() {
    if (!administratorDraft) {
      return;
    }

    const nextAdministrators = saveAdministrator(administratorDraft);

    setAdministrators(nextAdministrators);
    setSelectedAdministratorId(administratorDraft.id);
    setAnchoredProposals([]);
    setFormState((currentFormState) =>
      applyAdministratorToSimulationForm(currentFormState, administratorDraft),
    );

    if (administratorDraft.insuranceRequired) {
      setInsuranceOption("with-insurance");
    }
  }

  function handleResetAdministrators() {
    const defaultAdministrators = resetAdministratorsDefaults();
    const customAdministrator =
      defaultAdministrators.find(
        (administrator) => administrator.id === "custom",
      ) ?? defaultAdministrators[0];

    setAdministrators(defaultAdministrators);
    setSelectedAdministratorId(customAdministrator.id);
    setAdministratorDraft(customAdministrator);
    setAnchoredProposals([]);
    setFormState((currentFormState) =>
      applyAdministratorToSimulationForm(currentFormState, customAdministrator),
    );
    setInsuranceOption("with-insurance");
  }

  function handleSelectInsuranceOption(option: InsuranceOption) {
    if (isInsuranceOptionDisabled(option)) {
      return;
    }

    setAnchoredProposals([]);
    setInsuranceOption(option);
  }

  function handleSetBidType(nextBidType: BidType) {
    setAnchoredProposals([]);
    setBidType(nextBidType);
  }

  function isInsuranceOptionDisabled(option: InsuranceOption) {
    return (
      option === "without-insurance" &&
      Boolean(selectedAdministrator?.insuranceRequired)
    );
  }

  function getCurrentWealthJourney() {
    const wealthInput = loadWealthEvolutionInput();
    const evolution = buildWealthEvolution(wealthInput);

    return buildWealthJourney({ evolution, input: wealthInput });
  }

  function handleDuplicateSimulation(id: string) {
    const duplicatedSimulation = duplicateSimulation(id);

    if (!duplicatedSimulation) {
      return;
    }

    setSavedSimulations(loadSavedSimulations());
  }

  function handleDeleteSimulation(id: string) {
    const simulations = deleteSimulation(id);

    setSavedSimulations(simulations);

    if (activeSimulationId === id) {
      setActiveSimulationId(null);
    }
  }
}

function SimulationOperationPanel({
  activeSimulationId,
  bidType,
  commercialData,
  commercialConsultingConditionsByKind,
  formState,
  insuranceOption,
  intelligenceSummary,
  presentation,
  selectedScenarioKey,
  simulationName,
  simulatorInput,
  anchoredProposals,
  comfortableInstallment,
  isTechnicalDataOpen,
  leadProposalContext,
  leadSimulationSaveState,
  commercialProposalSaveState,
  personalizationSource,
  onCommercialDataChange,
  onCommercialConsultingConditionsChange,
  onContemplationMonthChange,
  onCustomizeAnchoredProposal,
  onFormStateChange,
  onGenerateAnchoredProposals,
  onGenerateAnchoredProposalPdf,
  onGeneratePdf,
  onInsuranceOptionChange,
  onSaveLeadSimulation,
  onSaveSimulation,
  onScenarioChange,
  onSetComfortableInstallment,
  onSetBidType,
  onSetSimulationName,
  onToggleTechnicalData,
  onClearLeadProposalContext,
  isInsuranceOptionDisabled,
}: {
  activeSimulationId: string | null;
  bidType: BidType;
  commercialData: SimulatorCommercialData;
  commercialConsultingConditionsByKind: CommercialConsultingConditionsByKind;
  formState: SimulatorFormState;
  insuranceOption: InsuranceOption;
  intelligenceSummary: IntelligenceSummary;
  presentation: ReturnType<typeof buildSimulatorCommercialPresentation>;
  selectedScenarioKey: SimulatorScenarioKey;
  simulationName: string;
  simulatorInput: SimulatorInput;
  anchoredProposals: AnchoredProposal[];
  comfortableInstallment: string;
  isTechnicalDataOpen: boolean;
  leadProposalContext?: CrmLeadProposalContext | null;
  leadSimulationSaveState: LeadSimulationSaveState;
  commercialProposalSaveState: CommercialProposalSaveState;
  personalizationSource: AnchoredPersonalizationSource | null;
  onCommercialDataChange: (state: Partial<SimulatorCommercialData>) => void;
  onCommercialConsultingConditionsChange: (
    kind: CommercialProposalSaveKind,
    state: Partial<CommercialConsultingConditionsState>,
  ) => void;
  onContemplationMonthChange: (month: number) => void;
  onCustomizeAnchoredProposal: (proposal: AnchoredProposal) => void;
  onFormStateChange: (state: Partial<SimulatorFormState>) => void;
  onGenerateAnchoredProposals: () => void;
  onGenerateAnchoredProposalPdf: (proposal: AnchoredProposal) => void;
  onGeneratePdf: () => void;
  onInsuranceOptionChange: (option: InsuranceOption) => void;
  onSaveLeadSimulation: () => void;
  onSaveSimulation: () => void;
  onScenarioChange: (scenario: SimulatorScenarioKey) => void;
  onSetComfortableInstallment: (value: string) => void;
  onSetBidType: (bidType: BidType) => void;
  onSetSimulationName: (name: string) => void;
  onToggleTechnicalData: () => void;
  onClearLeadProposalContext?: () => void;
  isInsuranceOptionDisabled: (option: InsuranceOption) => boolean;
}) {
  return (
    <section className="grid gap-5">
      <div className="grid gap-5">
        <section className="rounded-md border bg-card p-6 text-card-foreground sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Simulacao
              </p>
              <h2 className="mt-2 text-3xl font-semibold text-foreground">
                Simulacao patrimonial
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                Pagina principal de trabalho para preparar a apresentacao
                consultiva.
              </p>
            </div>
            <div className="grid w-full gap-3 lg:w-[320px]">
              <label className="grid gap-2 text-sm font-medium">
                Nome da simulacao
                <input
                  className="h-10 rounded-md border bg-background px-3 text-sm outline-none transition focus:ring-2 focus:ring-ring"
                  onChange={(event) => onSetSimulationName(event.target.value)}
                  placeholder="Simulacao do cliente"
                  value={simulationName}
                />
              </label>
              <div className="grid gap-2 sm:grid-cols-2">
                <PrimaryActionButton onClick={onSaveSimulation}>
                  <Save className="h-4 w-4" aria-hidden="true" />
                  {personalizationSource
                    ? "Salvar como nova proposta"
                    : "Salvar"}
                </PrimaryActionButton>
                <SecondaryActionButton onClick={onGeneratePdf}>
                  <FileDown className="h-4 w-4" aria-hidden="true" />
                  Gerar PDF
                </SecondaryActionButton>
              </div>
              {activeSimulationId ? (
                <p className="text-xs text-muted-foreground">
                  Editando simulacao salva.
                </p>
              ) : null}
              {personalizationSource ? (
                <p className="rounded-md border bg-primary/[0.04] px-3 py-2 text-xs leading-5 text-muted-foreground">
                  Personalizando a partir de {personalizationSource.sourceName}.
                  O registro original sera preservado.
                </p>
              ) : null}
            </div>
          </div>

          {leadProposalContext ? (
            <div className="mt-6 flex flex-col gap-3 rounded-md border bg-primary/[0.04] p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
                  {leadProposalContext.intent === "simulation"
                    ? "Gerando simulacao para"
                    : "Gerando proposta para"}
                </p>
                <p className="mt-1 text-base font-semibold text-foreground">
                  {leadProposalContext.leadName}
                </p>
                {leadSimulationSaveState.message ? (
                  <p
                    className={cn(
                      "mt-2 text-xs leading-5",
                      leadSimulationSaveState.status === "error"
                        ? "text-destructive"
                        : "text-muted-foreground",
                    )}
                  >
                    {leadSimulationSaveState.message}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <PrimaryActionButton
                  disabled={leadSimulationSaveState.status === "saving"}
                  onClick={onSaveLeadSimulation}
                >
                  <Save className="h-4 w-4" aria-hidden="true" />
                  {leadSimulationSaveState.status === "saving"
                    ? "Salvando..."
                    : "Salvar simulacao no lead"}
                </PrimaryActionButton>
                {onClearLeadProposalContext ? (
                  <SecondaryActionButton onClick={onClearLeadProposalContext}>
                    Encerrar contexto do lead
                  </SecondaryActionButton>
                ) : null}
              </div>
            </div>
          ) : null}
        </section>

        <section className="overflow-hidden rounded-md border border-emerald-200/20 bg-[radial-gradient(circle_at_top_left,rgba(220,198,126,0.24),transparent_32%),linear-gradient(135deg,#10201f_0%,#0f3b35_48%,#0f766e_100%)] p-6 text-white shadow-[0_24px_70px_rgba(15,59,53,0.24)] sm:p-8">
          <div className="mx-auto max-w-4xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-50/70">
              Mes de contemplacao
            </p>
            <div className="mt-5 flex items-center justify-center gap-5">
              <IconButton
                label="Diminuir mes"
                onClick={() =>
                  onContemplationMonthChange(
                    presentation.contemplationMonth - 1,
                  )
                }
              >
                <Minus className="h-5 w-5" aria-hidden="true" />
              </IconButton>
              <div className="min-w-36">
                <div className="text-7xl font-semibold tracking-normal text-white drop-shadow-sm sm:text-8xl">
                  {presentation.contemplationMonth}
                </div>
                <div className="mt-1 text-xs font-medium uppercase tracking-[0.14em] text-emerald-50/70">
                  de {simulatorInput.termMonths} meses
                </div>
              </div>
              <IconButton
                label="Aumentar mes"
                onClick={() =>
                  onContemplationMonthChange(
                    presentation.contemplationMonth + 1,
                  )
                }
              >
                <Plus className="h-5 w-5" aria-hidden="true" />
              </IconButton>
            </div>
            <input
              className="mt-8 w-full accent-[#d9c77f]"
              max={simulatorInput.termMonths}
              min={1}
              onChange={(event) =>
                onContemplationMonthChange(Number(event.target.value))
              }
              type="range"
              value={presentation.contemplationMonth}
            />
          </div>
        </section>

        <section className="grid gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Estrutura da operacao
            </p>
            <div className="mt-3 grid gap-4 md:grid-cols-3">
              <CommercialMetric
                label="Credito"
                value={currencyFormatter.format(presentation.commercialCredit)}
                featured
              />
              <CommercialMetric
                label="Parcela antes"
                value={currencyFormatter.format(
                  presentation.installmentBeforeContemplation,
                )}
                featured
              />
              <CommercialMetric
                label="Parcela pos"
                value={currencyFormatter.format(
                  presentation.installmentAfterContemplation,
                )}
                featured
              />
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Resultado da estrategia
            </p>
            <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <CommercialMetric
                label="Valor investido"
                value={currencyFormatter.format(presentation.realInvestment)}
              />
              <CommercialMetric
                label="Valor de venda estimado da carta"
                value={currencyFormatter.format(
                  presentation.estimatedCardSaleValue,
                )}
              />
              <CommercialMetric
                label="Lucro estimado na venda da carta"
                value={currencyFormatter.format(
                  presentation.estimatedCardSaleProfit,
                )}
              />
              <CommercialMetric
                label="Percentual de lucro na venda da carta"
                value={formatEstimatedCardSaleProfitRate(presentation)}
              />
            </div>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="rounded-md border bg-card p-5 text-card-foreground">
            <h3 className="text-sm font-semibold">Cenarios comerciais</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {scenarioOptions.map((option) => (
                <SelectionButton
                  isActive={selectedScenarioKey === option.key}
                  key={option.key}
                  onClick={() => onScenarioChange(option.key)}
                >
                  {option.label}
                </SelectionButton>
              ))}
            </div>
          </section>

          <section className="rounded-md border bg-card p-5 text-card-foreground">
            <h3 className="text-sm font-semibold">Ajustes comerciais</h3>
            <div className="mt-4 grid gap-3">
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                {insuranceOptions.map((option) => (
                  <SelectionButton
                    disabled={isInsuranceOptionDisabled(option.key)}
                    isActive={insuranceOption === option.key}
                    key={option.key}
                    onClick={() => onInsuranceOptionChange(option.key)}
                  >
                    {option.label}
                  </SelectionButton>
                ))}
              </div>
              <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
                {bidOptions.map((option) => (
                  <SelectionButton
                    isActive={bidType === option.key}
                    key={option.key}
                    onClick={() => onSetBidType(option.key)}
                  >
                    {option.label}
                  </SelectionButton>
                ))}
              </div>
            </div>
          </section>
        </section>

        <CommercialDataSection
          commercialData={commercialData}
          onChange={onCommercialDataChange}
        />

        <AnchoredProposalsSection
          commercialConsultingConditionsByKind={
            commercialConsultingConditionsByKind
          }
          commercialProposalSaveState={commercialProposalSaveState}
          comfortableInstallment={comfortableInstallment}
          isHighlighted={leadProposalContext?.intent === "proposal"}
          proposals={anchoredProposals}
          onComfortableInstallmentChange={onSetComfortableInstallment}
          onCustomizeProposal={onCustomizeAnchoredProposal}
          onGenerate={onGenerateAnchoredProposals}
          onGenerateProposalPdf={onGenerateAnchoredProposalPdf}
          onProposalConsultingConditionsChange={
            onCommercialConsultingConditionsChange
          }
        />

        <section className="rounded-md border bg-primary/[0.03] p-5 text-card-foreground">
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
            Resumo EVOLV
          </p>
          <p className="mt-3 text-sm leading-6 text-foreground">
            {intelligenceSummary.executiveSummary}
          </p>
        </section>

        <section className="rounded-md border bg-card p-5 text-card-foreground">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold">Dados tecnicos</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Parametros operacionais ficam recolhidos para preservar a
                leitura comercial.
              </p>
            </div>
            <SecondaryActionButton onClick={onToggleTechnicalData}>
              {isTechnicalDataOpen ? "Ocultar dados tecnicos" : "Dados tecnicos"}
            </SecondaryActionButton>
          </div>
          {isTechnicalDataOpen ? (
            <div className="mt-5">
              <TechnicalSettingsPanel
                formState={formState}
                onChange={onFormStateChange}
              />
            </div>
          ) : null}
        </section>
      </div>
    </section>
  );
}

function AnchoredProposalsSection({
  commercialConsultingConditionsByKind,
  commercialProposalSaveState,
  comfortableInstallment,
  isHighlighted = false,
  proposals,
  onComfortableInstallmentChange,
  onCustomizeProposal,
  onGenerate,
  onGenerateProposalPdf,
  onProposalConsultingConditionsChange,
}: {
  commercialConsultingConditionsByKind: CommercialConsultingConditionsByKind;
  commercialProposalSaveState: CommercialProposalSaveState;
  comfortableInstallment: string;
  isHighlighted?: boolean;
  proposals: AnchoredProposal[];
  onComfortableInstallmentChange: (value: string) => void;
  onCustomizeProposal: (proposal: AnchoredProposal) => void;
  onGenerate: () => void;
  onGenerateProposalPdf: (proposal: AnchoredProposal) => void;
  onProposalConsultingConditionsChange: (
    kind: CommercialProposalSaveKind,
    state: Partial<CommercialConsultingConditionsState>,
  ) => void;
}) {
  return (
    <section
      className={cn(
        "rounded-md border bg-card p-5 text-card-foreground sm:p-6",
        isHighlighted && "border-primary/30 bg-primary/[0.025]",
      )}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Alternativas patrimoniais
          </p>
          <h2 className="mt-2 text-base font-semibold">
            Possibilidades para seu objetivo
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Informe a parcela confortavel do cliente para comparar opcoes
            conservadora, recomendada e patrimonial usando as regras atuais da
            simulacao.
          </p>
        </div>
        <div className="grid w-full gap-3 sm:grid-cols-[minmax(0,1fr)_auto] lg:w-[420px]">
          <SimulatorInputField
            label="Parcela confortavel do cliente"
            value={comfortableInstallment}
            onChange={onComfortableInstallmentChange}
          />
          <div className="flex items-end">
            <PrimaryActionButton onClick={onGenerate}>
              Gerar propostas
            </PrimaryActionButton>
          </div>
        </div>
      </div>

      {proposals.length > 0 ? (
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {proposals.map((proposal) => {
            const consultingConditions =
              commercialConsultingConditionsByKind[proposal.kind] ??
              initialCommercialConsultingConditions;
            const proposalSaveRecord =
              commercialProposalSaveState.records[proposal.kind];
            const projection = resolveCommercialProposalProjection(
              proposal,
              proposalSaveRecord,
            );
            const displayedProposal = projection.proposal;
            const isSavingProposal =
              commercialProposalSaveState.status === "saving" &&
              commercialProposalSaveState.activeKind === proposal.kind;

            return (
              <article
                className="grid gap-4 rounded-md border bg-background p-4"
                key={proposal.kind}
              >
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
                    {displayedProposal.label}
                  </p>
                  {projection.isCustomized ? (
                    <p className="mt-2 inline-flex w-fit rounded-full border border-primary/20 bg-primary/[0.06] px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-primary">
                      Personalizada
                    </p>
                  ) : null}
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {displayedProposal.objective}
                  </p>
                </div>

                <div className="grid gap-3 text-sm">
                  <AnchoredProposalValue
                    label="Credito"
                    value={currencyFormatter.format(
                      displayedProposal.presentation.commercialCredit,
                    )}
                  />
                  <AnchoredProposalValue
                    label="Parcela"
                    value={currencyFormatter.format(
                      displayedProposal.presentation
                        .installmentBeforeContemplation,
                    )}
                    featured
                  />
                  <AnchoredProposalValue
                    label="Cenario"
                    value={displayedProposal.presentation.selectedScenarioName}
                  />
                  <AnchoredProposalValue
                    label="Parcela pos"
                    value={currencyFormatter.format(
                      displayedProposal.presentation.installmentAfterContemplation,
                    )}
                  />
                  <AnchoredProposalValue
                    label="Venda estimada"
                    value={currencyFormatter.format(
                      displayedProposal.presentation.estimatedCardSaleValue,
                    )}
                  />
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <SecondaryActionButton
                    onClick={() => onCustomizeProposal(displayedProposal)}
                  >
                    Personalizar
                  </SecondaryActionButton>
                  <SecondaryActionButton
                    disabled={commercialProposalSaveState.status === "saving"}
                    onClick={() => onGenerateProposalPdf(displayedProposal)}
                  >
                    <FileDown className="h-4 w-4" aria-hidden="true" />
                    {isSavingProposal ? "Preparando..." : "Gerar PDF"}
                  </SecondaryActionButton>
                </div>
                <ConsultingConditionsEditor
                  conditions={consultingConditions}
                  onChange={(state) =>
                    onProposalConsultingConditionsChange(proposal.kind, state)
                  }
                />
                {proposalSaveRecord?.message ? (
                  <p
                    className={cn(
                      "text-xs leading-5",
                      proposalSaveRecord.status === "error"
                        ? "text-destructive"
                        : "text-muted-foreground",
                    )}
                  >
                    {proposalSaveRecord.message}
                    {proposalSaveRecord.status === "success" &&
                    proposalSaveRecord.variant === "customized" ? (
                      <span className="mt-1 block">
                        Registro personalizado preservado no Lead.
                      </span>
                    ) : null}
                  </p>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : (
        <div className="mt-5 rounded-md border border-dashed bg-background p-4 text-sm text-muted-foreground">
          Nenhuma proposta gerada ainda.
        </div>
      )}
    </section>
  );
}

function AnchoredProposalValue({
  featured = false,
  label,
  value,
}: {
  featured?: boolean;
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 font-medium text-foreground",
          featured && "text-lg font-semibold",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function CommercialProposalEditorDrawer({
  editor,
  onChangeDraft,
  onClose,
  onSave,
}: {
  editor: CommercialProposalEditorState;
  onChangeDraft: (draft: Partial<CommercialProposalEditorDraft>) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const isBusy = editor.status === "calculating" || editor.status === "saving";

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30 p-3 sm:p-6">
      <aside className="flex h-full w-full max-w-2xl flex-col overflow-hidden rounded-md border bg-card text-card-foreground shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Editor de Propostas Comerciais
            </p>
            <h3 className="mt-2 text-lg font-semibold text-foreground">
              {editor.sourceProposal.label}
            </h3>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Ajuste parametros suportados pelo simulador. A sugestao original
              permanece preservada.
            </p>
          </div>
          <button
            aria-label="Fechar editor"
            className="rounded-md border bg-background px-3 py-2 text-sm transition hover:bg-accent"
            onClick={onClose}
            type="button"
          >
            Fechar
          </button>
        </div>

        <div className="grid flex-1 gap-5 overflow-y-auto p-5">
          <div className="grid gap-3 md:grid-cols-2">
            <SimulatorInputField
              label="Credito"
              onChange={(value) =>
                onChangeDraft({
                  credit: value,
                  lastEditedAmountField: "credit",
                })
              }
              value={editor.draft.credit}
            />
            <SimulatorInputField
              label="Parcela alvo"
              onChange={(value) =>
                onChangeDraft({
                  lastEditedAmountField: "targetInstallment",
                  targetInstallment: value,
                })
              }
              value={editor.draft.targetInstallment}
            />
            <SimulatorInputField
              label="Prazo"
              onChange={(value) => onChangeDraft({ termMonths: value })}
              value={editor.draft.termMonths}
            />
            <SimulatorInputField
              label="Mes de contemplacao"
              onChange={(value) => onChangeDraft({ contemplationMonth: value })}
              value={editor.draft.contemplationMonth}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <EditorSelect
              label="Cenario"
              onChange={(value) =>
                onChangeDraft({ scenarioKey: value as SimulatorScenarioKey })
              }
              options={scenarioOptions.map((option) => ({
                label: option.label,
                value: option.key,
              }))}
              value={editor.draft.scenarioKey}
            />
            <EditorSelect
              label="Seguro"
              onChange={(value) =>
                onChangeDraft({ insuranceOption: value as InsuranceOption })
              }
              options={insuranceOptions.map((option) => ({
                label: option.label,
                value: option.key,
              }))}
              value={editor.draft.insuranceOption}
            />
            <EditorSelect
              label="Lance"
              onChange={(value) => onChangeDraft({ bidType: value as BidType })}
              options={bidOptions.map((option) => ({
                label: option.label,
                value: option.key,
              }))}
              value={editor.draft.bidType}
            />
          </div>

          <section className="rounded-md border bg-background/70 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Previa recalculada
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {editor.message}
                </p>
              </div>
              <span className="rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
                {editor.status === "calculating"
                  ? "Recalculando"
                  : editor.status === "saving"
                    ? "Salvando"
                    : "Pronta"}
              </span>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <AnchoredProposalValue
                featured
                label="Credito"
                value={currencyFormatter.format(
                  editor.preview.presentation.commercialCredit,
                )}
              />
              <AnchoredProposalValue
                featured
                label="Parcela"
                value={currencyFormatter.format(
                  editor.preview.presentation.installmentBeforeContemplation,
                )}
              />
              <AnchoredProposalValue
                label="Parcela pos"
                value={currencyFormatter.format(
                  editor.preview.presentation.installmentAfterContemplation,
                )}
              />
              <AnchoredProposalValue
                label="Venda estimada"
                value={currencyFormatter.format(
                  editor.preview.presentation.estimatedCardSaleValue,
                )}
              />
              <AnchoredProposalValue
                label="Investimento"
                value={currencyFormatter.format(
                  editor.preview.presentation.realInvestment,
                )}
              />
              <AnchoredProposalValue
                label="Lucro"
                value={currencyFormatter.format(
                  editor.preview.presentation.estimatedCardSaleProfit,
                )}
              />
            </div>
          </section>
        </div>

        <div className="flex flex-col gap-2 border-t p-5 sm:flex-row sm:justify-end">
          <SecondaryActionButton onClick={onClose}>Cancelar</SecondaryActionButton>
          <PrimaryActionButton disabled={isBusy} onClick={onSave}>
            <Save className="h-4 w-4" aria-hidden="true" />
            {editor.status === "saving" ? "Salvando..." : "Salvar proposta"}
          </PrimaryActionButton>
        </div>
      </aside>
    </div>
  );
}

function EditorSelect({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  value: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      {label}
      <select
        className="h-10 rounded-md border bg-background px-3 text-sm outline-none transition focus:ring-2 focus:ring-ring"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function CommercialDataSection({
  commercialData,
  onChange,
}: {
  commercialData: SimulatorCommercialData;
  onChange: (state: Partial<SimulatorCommercialData>) => void;
}) {
  return (
    <section className="rounded-md border bg-card p-5 text-card-foreground sm:p-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold">Dados comerciais</h2>
        <p className="text-sm text-muted-foreground">
          Informacoes opcionais para salvar junto com a simulacao e compor o
          PDF comercial.
        </p>
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <CommercialDataField
          label="Cliente"
          value={commercialData.clientName}
          onChange={(clientName) => onChange({ clientName })}
        />
        <CommercialDataField
          label="Telefone"
          value={commercialData.clientPhone}
          onChange={(clientPhone) => onChange({ clientPhone })}
        />
        <CommercialDataField
          label="E-mail"
          value={commercialData.clientEmail}
          onChange={(clientEmail) => onChange({ clientEmail })}
        />
        <CommercialDataField
          label="Consultor"
          value={commercialData.consultantName}
          onChange={(consultantName) => onChange({ consultantName })}
        />
        <CommercialDataTextArea
          label="Observacoes"
          value={commercialData.commercialNotes}
          onChange={(commercialNotes) => onChange({ commercialNotes })}
        />
      </div>
    </section>
  );
}

function AdministratorSection({
  administratorDraft,
  administrators,
  isAdministratorEditorOpen,
  selectedAdministrator,
  selectedAdministratorId,
  onResetAdministrators,
  onSaveAdministratorDraft,
  onSelectAdministrator,
  onSetAdministratorDraft,
  onSetAdministratorDraftParameter,
  onToggleAdministratorEditor,
  showEditorControls = true,
}: {
  administratorDraft: SimulatorAdministrator | null;
  administrators: SimulatorAdministrator[];
  isAdministratorEditorOpen: boolean;
  selectedAdministrator: SimulatorAdministrator | null;
  selectedAdministratorId: string;
  onResetAdministrators: () => void;
  onSaveAdministratorDraft: () => void;
  onSelectAdministrator: (administratorId: string) => void;
  onSetAdministratorDraft: (state: Partial<SimulatorAdministrator>) => void;
  onSetAdministratorDraftParameter: (
    state: Partial<SimulatorAdministrator["parameters"]>,
  ) => void;
  onToggleAdministratorEditor: () => void;
  showEditorControls?: boolean;
}) {
  return (
    <section className="rounded-md border bg-card p-5 text-card-foreground sm:p-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold">Administradora</h2>
        <p className="text-sm text-muted-foreground">
          Parametros padrao aplicaveis sem bloquear edicao manual.
        </p>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <label className="grid gap-2 text-sm font-medium">
          Administradora selecionada
          <select
            className="h-10 rounded-md border bg-background px-3 text-sm outline-none transition focus:ring-2 focus:ring-ring"
            onChange={(event) => onSelectAdministrator(event.target.value)}
            value={selectedAdministratorId}
          >
            {administrators.map((administrator) => (
              <option key={administrator.id} value={administrator.id}>
                {administrator.name}
              </option>
            ))}
          </select>
        </label>

        {showEditorControls ? (
          <div className="grid gap-2 sm:grid-cols-2 lg:w-[320px]">
            <SecondaryActionButton onClick={onToggleAdministratorEditor}>
              Editar parametros
            </SecondaryActionButton>
            <SecondaryActionButton onClick={onResetAdministrators}>
              Resetar defaults
            </SecondaryActionButton>
          </div>
        ) : null}
      </div>

      {selectedAdministrator?.insuranceRequired ? (
        <p className="mt-3 text-sm font-medium text-primary">
          Seguro obrigatorio nesta administradora.
        </p>
      ) : null}

      {showEditorControls && isAdministratorEditorOpen && administratorDraft ? (
        <div className="mt-5 grid gap-4 border-t pt-5 md:grid-cols-2 xl:grid-cols-6">
          <AdministratorInputField
            label="Nome"
            value={administratorDraft.name}
            onChange={(name) => onSetAdministratorDraft({ name })}
          />
          <AdministratorInputField
            label="Taxa administrativa (%)"
            value={administratorDraft.parameters.administrativeFeePercent}
            onChange={(administrativeFeePercent) =>
              onSetAdministratorDraftParameter({ administrativeFeePercent })
            }
          />
          <AdministratorInputField
            label="Fundo de reserva (%)"
            value={administratorDraft.parameters.reserveFundPercent}
            onChange={(reserveFundPercent) =>
              onSetAdministratorDraftParameter({ reserveFundPercent })
            }
          />
          <AdministratorInputField
            label="Prazo padrao"
            value={administratorDraft.parameters.termMonths}
            onChange={(termMonths) =>
              onSetAdministratorDraftParameter({ termMonths })
            }
          />
          <AdministratorInputField
            label="Seguro padrao (%)"
            value={administratorDraft.parameters.monthlyInsurancePercent}
            onChange={(monthlyInsurancePercent) =>
              onSetAdministratorDraftParameter({ monthlyInsurancePercent })
            }
          />
          <div className="grid gap-2 text-sm font-medium">
            Seguro obrigatorio
            <button
              className={cn(
                "h-10 rounded-md border px-3 text-sm font-medium transition",
                administratorDraft.insuranceRequired
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-background hover:border-primary/40 hover:bg-accent",
              )}
              onClick={() =>
                onSetAdministratorDraft({
                  insuranceRequired: !administratorDraft.insuranceRequired,
                })
              }
              type="button"
            >
              {administratorDraft.insuranceRequired ? "Sim" : "Nao"}
            </button>
          </div>
          <div className="flex items-end md:col-span-2 xl:col-span-6">
            <PrimaryActionButton onClick={onSaveAdministratorDraft}>
              Salvar e aplicar administradora
            </PrimaryActionButton>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function SimulationResults({
  presentation,
}: {
  presentation: ReturnType<typeof buildSimulatorCommercialPresentation>;
}) {
  return (
    <section className="grid gap-5">
      <section className="rounded-md border bg-card p-6 text-card-foreground sm:p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Resultado
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-foreground">
          Resultado comercial
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Visao consolidada dos principais indicadores da simulacao.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <CommercialMetric
          label="Credito"
          value={currencyFormatter.format(presentation.commercialCredit)}
          featured
        />
        <CommercialMetric
          label="Credito atualizado"
          value={currencyFormatter.format(presentation.updatedCredit)}
        />
        <CommercialMetric
          label="Credito base"
          value={currencyFormatter.format(presentation.contractedCredit)}
        />
        <CommercialMetric
          label="Credito liquido disponivel"
          value={currencyFormatter.format(presentation.liquidCredit)}
        />
        <CommercialMetric
          label="Total investido"
          value={currencyFormatter.format(
            presentation.totalInvestedUntilContemplation,
          )}
          featured
        />
        <CommercialMetric
          label="Parcela antes"
          value={currencyFormatter.format(
            presentation.installmentBeforeContemplation,
          )}
          featured
        />
        <CommercialMetric
          label="Parcela pos"
          value={currencyFormatter.format(
            presentation.installmentAfterContemplation,
          )}
          featured
        />
        <CommercialMetric
          label="Venda estimada"
          value={currencyFormatter.format(presentation.estimatedCardSaleValue)}
          featured
        />
        <CommercialMetric
          label="Lucro estimado na venda da carta"
          value={currencyFormatter.format(presentation.estimatedCardSaleProfit)}
          featured
        />
        <CommercialMetric
          label="Percentual de lucro na venda da carta"
          value={formatEstimatedCardSaleProfitRate(presentation)}
        />
        <CommercialMetric
          label="Multiplo de alavancagem"
          value={`${presentation.leverageMultiple.toLocaleString("pt-BR", {
            maximumFractionDigits: 2,
            minimumFractionDigits: 2,
          })}x`}
        />
      </section>

      {presentation.installmentAfterContemplationFallback ? (
        <div className="rounded-md border bg-accent px-5 py-3 text-sm text-accent-foreground">
          A contemplacao foi selecionada no ultimo mes do prazo. A parcela
          cheia foi usada como referencia pos-contemplacao.
        </div>
      ) : null}
    </section>
  );
}

function SavedSimulationsPanel({
  activeSimulationId,
  savedSimulations,
  onDelete,
  onDuplicate,
  onOpen,
}: {
  activeSimulationId: string | null;
  savedSimulations: SimulatorSavedSimulation[];
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onOpen: (simulation: SimulatorSavedSimulation) => void;
}) {
  return (
    <section className="rounded-md border bg-card p-5 text-card-foreground sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-base font-semibold">Simulacoes salvas</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Historico local deste navegador.
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          {savedSimulations.length} registros
        </p>
      </div>

      {savedSimulations.length > 0 ? (
        <div className="mt-5 grid gap-3">
          {savedSimulations.map((simulation) => (
            <article
              className={cn(
                "grid gap-4 rounded-md border bg-background p-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto] lg:items-center",
                activeSimulationId === simulation.id &&
                  "border-primary/50 bg-primary/[0.03]",
              )}
              key={simulation.id}
            >
              <div className="min-w-0">
                <h3 className="truncate text-sm font-semibold">
                  {simulation.name}
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Atualizada em {formatSimulationDate(simulation.updatedAt)}
                </p>
              </div>

              <div className="grid gap-2 text-sm sm:grid-cols-2">
                <SavedValue
                  label="Credito"
                  value={currencyFormatter.format(
                    simulation.results.commercialCredit,
                  )}
                />
                <SavedValue
                  label="Cenario"
                  value={simulation.results.selectedScenarioName}
                />
                <SavedValue
                  label="Venda"
                  value={currencyFormatter.format(
                    simulation.results.estimatedCardSaleValue,
                  )}
                />
                <SavedValue
                  label="Lucro"
                  value={currencyFormatter.format(
                    simulation.results.estimatedCardSaleProfit,
                  )}
                />
              </div>

              <div className="flex items-center gap-2 lg:justify-end">
                <ActionButton label="Abrir" onClick={() => onOpen(simulation)}>
                  <FolderOpen className="h-4 w-4" aria-hidden="true" />
                </ActionButton>
                <ActionButton
                  label="Duplicar"
                  onClick={() => onDuplicate(simulation.id)}
                >
                  <Copy className="h-4 w-4" aria-hidden="true" />
                </ActionButton>
                <ActionButton
                  label="Excluir"
                  onClick={() => onDelete(simulation.id)}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </ActionButton>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-md border border-dashed bg-background p-5 text-sm text-muted-foreground">
          Nenhuma simulacao salva neste navegador.
        </div>
      )}
    </section>
  );
}

function TechnicalSettingsPanel({
  formState,
  onChange,
}: {
  formState: SimulatorFormState;
  onChange: (state: Partial<SimulatorFormState>) => void;
}) {
  return (
    <section className="rounded-md border bg-card p-5 text-card-foreground sm:p-6">
      <div>
        <h2 className="text-base font-semibold">Dados Tecnicos</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Parametros completos da simulacao.
        </p>
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SimulatorInputField
          label="Credito"
          value={formState.credit}
          onChange={(credit) => onChange({ credit })}
        />
        <SimulatorInputField
          label="Taxa administrativa (%)"
          value={formState.administrativeFeePercent}
          onChange={(administrativeFeePercent) =>
            onChange({ administrativeFeePercent })
          }
        />
        <SimulatorInputField
          label="Fundo de reserva (%)"
          value={formState.reserveFundPercent}
          onChange={(reserveFundPercent) => onChange({ reserveFundPercent })}
        />
        <SimulatorInputField
          label="Prazo em meses"
          value={formState.termMonths}
          onChange={(termMonths) => onChange({ termMonths })}
        />
        <SimulatorInputField
          label="Seguro mensal (%)"
          value={formState.monthlyInsurancePercent}
          onChange={(monthlyInsurancePercent) =>
            onChange({ monthlyInsurancePercent })
          }
        />
        <SimulatorInputField
          label="INCC (%)"
          value={formState.inccPercent}
          onChange={(inccPercent) => onChange({ inccPercent })}
        />
        <SimulatorInputField
          label="Venda da carta (%)"
          value={formState.cardSalePercent}
          onChange={(cardSalePercent) => onChange({ cardSalePercent })}
        />
        <SimulatorInputField
          label="Lance embutido (%)"
          value={formState.embeddedBidPercent}
          onChange={(embeddedBidPercent) => onChange({ embeddedBidPercent })}
        />
        <SimulatorInputField
          label="Lance em dinheiro (%)"
          value={formState.cashBidPercent}
          onChange={(cashBidPercent) => onChange({ cashBidPercent })}
        />
        <div className="rounded-md border bg-background p-3 text-sm">
          <p className="font-medium">Validacao da especificacao</p>
          <p
            className={cn(
              "mt-1 font-semibold",
              isSimulatorExampleValid() ? "text-emerald-700" : "text-destructive",
            )}
          >
            {isSimulatorExampleValid()
              ? "Resultados conferidos"
              : "Resultados divergentes"}
          </p>
        </div>
      </div>
    </section>
  );
}

function IntelligenceSummaryPanel({
  portfolioIntelligence,
  recommendations,
  summary,
}: {
  portfolioIntelligence: PortfolioIntelligence;
  recommendations: Recommendation[];
  summary: IntelligenceSummary;
}) {
  return (
    <section className="grid gap-5">
      <section className="rounded-md border bg-card p-6 text-card-foreground sm:p-7">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Intelligence
          </p>
          <h2 className="text-xl font-semibold text-foreground">
            Analise EVOLV
          </h2>
        </div>

        <div className="mt-5 rounded-md border bg-primary/[0.03] p-5">
          <p className="text-sm font-medium text-muted-foreground">
            Resumo Executivo
          </p>
          <p className="mt-2 text-base leading-7 text-foreground">
            {summary.executiveSummary}
          </p>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <IntelligenceList
            title="Principais Insights"
            items={summary.insights}
          />
          <IntelligenceList
            title="Pontos de Atencao"
            items={summary.attentionPoints}
          />
          <IntelligenceList
            title="Oportunidades"
            items={summary.opportunities}
          />
        </div>
      </section>

      <RecommendationsPanel
        recommendations={recommendations}
        title="Recomendacoes Consultivas"
      />

      <PortfolioIntelligencePanel
        intelligence={portfolioIntelligence}
        title="Diagnostico Patrimonial"
      />
    </section>
  );
}

function IntelligenceList({
  items,
  title,
}: {
  items: string[];
  title: string;
}) {
  return (
    <article className="rounded-md border bg-background p-4">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <ul className="mt-3 grid gap-2 text-sm leading-6 text-muted-foreground">
        {items.map((item) => (
          <li className="flex gap-2" key={item}>
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

function PrimaryActionButton({
  children,
  disabled = false,
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-primary bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function SecondaryActionButton({
  children,
  disabled = false,
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className="inline-flex h-10 items-center justify-center gap-2 rounded-md border bg-background px-4 text-sm font-medium transition hover:border-primary/40 hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function SelectionButton({
  children,
  disabled = false,
  isActive,
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        "h-11 rounded-md border px-4 text-sm font-medium transition",
        isActive
          ? "border-primary bg-primary text-primary-foreground shadow-sm"
          : "bg-background text-foreground hover:border-primary/40 hover:bg-accent",
        disabled &&
          "cursor-not-allowed opacity-50 hover:border-border hover:bg-background",
      )}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function toAdministratorFromSavedData(simulation: {
  administratorData: SimulatorSavedAdministratorData;
}): SimulatorAdministrator {
  return {
    id: simulation.administratorData.selectedAdministratorId,
    name: simulation.administratorData.selectedAdministratorName,
    kind: simulation.administratorData.administratorKind,
    parameters: simulation.administratorData.appliedParameters,
    insuranceRequired: simulation.administratorData.insuranceRequired,
  };
}

function AdministratorInputField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      {label}
      <input
        className="h-10 rounded-md border bg-background px-3 text-sm outline-none transition focus:ring-2 focus:ring-ring"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </label>
  );
}

function CommercialDataField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      {label}
      <input
        className="h-10 rounded-md border bg-background px-3 text-sm outline-none transition focus:ring-2 focus:ring-ring"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </label>
  );
}

function CommercialDataTextArea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium md:col-span-2 xl:col-span-4">
      {label}
      <textarea
        className="min-h-24 resize-y rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-ring"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </label>
  );
}

function CommercialMetric({
  featured = false,
  label,
  value,
}: {
  featured?: boolean;
  label: string;
  value: string;
}) {
  return (
    <article
      className={cn(
        "rounded-md border bg-card p-5 text-card-foreground",
        featured && "border-primary/20 bg-primary/[0.03]",
      )}
    >
      <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-3 font-semibold tracking-normal",
          featured ? "text-2xl text-primary" : "text-xl text-foreground",
        )}
      >
        {value}
      </p>
    </article>
  );
}

function SavedValue({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 truncate font-medium text-foreground">{value}</p>
    </div>
  );
}

function ActionButton({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      className="flex h-9 w-9 items-center justify-center rounded-md border bg-card transition hover:border-primary/40 hover:bg-accent"
      onClick={onClick}
      title={label}
      type="button"
    >
      {children}
    </button>
  );
}

function IconButton({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      className="flex h-10 w-10 items-center justify-center rounded-md border bg-background transition hover:border-primary/40 hover:bg-accent"
      onClick={onClick}
      title={label}
      type="button"
    >
      {children}
    </button>
  );
}

function SimulatorInputField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      {label}
      <input
        className="h-10 rounded-md border bg-background px-3 text-sm outline-none transition focus:ring-2 focus:ring-ring"
        inputMode="decimal"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </label>
  );
}

function toSimulatorInput(formState: SimulatorFormState): SimulatorInput {
  return {
    credit: parsePositiveNumber(formState.credit),
    administrativeFeeRate: percentToRate(
      formState.administrativeFeePercent,
    ),
    reserveFundRate: percentToRate(formState.reserveFundPercent),
    termMonths: Math.max(
      1,
      Math.trunc(parsePositiveNumber(formState.termMonths)),
    ),
    monthlyInsuranceRate: percentToRate(formState.monthlyInsurancePercent),
    inccRate: percentToRate(formState.inccPercent),
    cardSaleRate: percentToRate(formState.cardSalePercent),
    embeddedBidRate: percentToRate(formState.embeddedBidPercent),
    cashBidRate: percentToRate(formState.cashBidPercent),
  };
}

function parsePositiveNumber(value: string) {
  const normalized = Number(value.replace(",", "."));

  return Number.isFinite(normalized) && normalized > 0 ? normalized : 0.01;
}

function parseCurrencyNumber(value: string) {
  const normalized = value
    .replace(/\s/g, "")
    .replace(/[R$]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const parsedValue = Number(normalized);

  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : 0;
}

function formatEstimatedCardSaleProfitRate(
  presentation: SimulatorCommercialPresentation,
) {
  if (
    !Number.isFinite(presentation.realInvestment) ||
    presentation.realInvestment <= 0 ||
    !Number.isFinite(presentation.estimatedCardSaleGainRate)
  ) {
    return "—";
  }

  return percentFormatter.format(presentation.estimatedCardSaleGainRate);
}

function buildCommercialProposalEditorRequest(
  editor: CommercialProposalEditorState,
):
  | {
      input: {
        baseInput: SimulatorInput;
        bidType: BidType;
        contemplationMonth: number;
        credit: number | null;
        insuranceOption: InsuranceOption;
        scenarioKey: SimulatorScenarioKey;
        targetInstallment: number | null;
        termMonths: number | null;
      };
      ok: true;
    }
  | { message: string; ok: false } {
  const credit = parseCurrencyNumber(editor.draft.credit);
  const targetInstallment = parseCurrencyNumber(editor.draft.targetInstallment);
  const termMonths = parsePositiveIntegerOrNull(editor.draft.termMonths);
  const contemplationMonth = parsePositiveIntegerOrNull(
    editor.draft.contemplationMonth,
  );

  if (editor.draft.lastEditedAmountField === "credit" && credit <= 0) {
    return { message: "Informe um credito valido.", ok: false };
  }

  if (
    editor.draft.lastEditedAmountField === "targetInstallment" &&
    targetInstallment <= 0
  ) {
    return { message: "Informe uma parcela alvo valida.", ok: false };
  }

  if (!termMonths) {
    return { message: "Informe um prazo valido.", ok: false };
  }

  if (!contemplationMonth) {
    return { message: "Informe um mes de contemplacao valido.", ok: false };
  }

  return {
    input: {
      baseInput: editor.sourceProposal.input,
      bidType: editor.draft.bidType,
      contemplationMonth,
      credit:
        editor.draft.lastEditedAmountField === "credit" && credit > 0
          ? credit
          : null,
      insuranceOption: editor.draft.insuranceOption,
      scenarioKey: editor.draft.scenarioKey,
      targetInstallment:
        editor.draft.lastEditedAmountField === "targetInstallment"
          ? targetInstallment
          : null,
      termMonths,
    },
    ok: true,
  };
}

function synchronizeCommercialProposalEditorDraftWithPreview(
  draft: CommercialProposalEditorDraft,
  preview: CommercialProposalEditorCalculationResult,
): CommercialProposalEditorDraft {
  if (draft.lastEditedAmountField === "targetInstallment") {
    const nextCredit = formatEditorCurrencyValue(preview.input.credit);

    return draft.credit === nextCredit ? draft : { ...draft, credit: nextCredit };
  }

  const nextTargetInstallment = formatEditorCurrencyValue(
    preview.presentation.installmentBeforeContemplation,
  );

  return draft.targetInstallment === nextTargetInstallment
    ? draft
    : { ...draft, targetInstallment: nextTargetInstallment };
}

function formatEditorCurrencyValue(value: number) {
  return Number.isFinite(value) && value > 0
    ? value.toLocaleString("pt-BR", {
        maximumFractionDigits: 2,
        minimumFractionDigits: 2,
      })
    : "";
}

function parsePositiveIntegerOrNull(value: string) {
  const parsedValue = Number(value.replace(",", "."));

  return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : null;
}

async function fetchCommercialProposalPreview(
  input: {
    baseInput: SimulatorInput;
    bidType: BidType;
    contemplationMonth: number;
    credit: number | null;
    insuranceOption: InsuranceOption;
    scenarioKey: SimulatorScenarioKey;
    targetInstallment: number | null;
    termMonths: number | null;
  },
  signal: AbortSignal,
) {
  const response = await fetch("/api/simulator/commercial-proposal-preview", {
    body: JSON.stringify(input),
    headers: {
      "content-type": "application/json",
    },
    method: "POST",
    signal,
  });
  const payload = (await response.json().catch(() => null)) as
    | {
        error?: string;
        preview?: CommercialProposalEditorCalculationResult;
      }
    | null;

  if (!response.ok || !payload?.preview) {
    throw new Error(payload?.error ?? "Nao foi possivel recalcular a proposta.");
  }

  return payload.preview;
}

async function persistLeadSimulationForProposal({
  accessToken,
  bidType,
  commercialData,
  formState,
  insuranceOption,
  leadProposalContext,
  proposal,
  selectedAdministrator,
  title,
}: {
  accessToken: string;
  bidType: BidType;
  commercialData: SimulatorCommercialData;
  formState: SimulatorFormState;
  insuranceOption: InsuranceOption;
  leadProposalContext: CrmLeadProposalContext;
  proposal: AnchoredProposal;
  selectedAdministrator: SimulatorAdministrator | null;
  title: string;
}) {
  const payload = buildLeadSimulationApiPayload({
    bidType,
    calculation: calculateSimulatorScenarios(proposal.input),
    commercialData,
    formState: {
      ...formState,
      credit: String(proposal.input.credit),
      termMonths: String(proposal.input.termMonths),
    },
    insuranceOption,
    leadProposalContext,
    presentation: proposal.presentation,
    selectedAdministrator,
    selectedScenarioKey: proposal.scenarioKey,
    simulationName: title,
    simulatorInput: proposal.input,
  });

  const response = await fetch("/api/crm/lead-simulations", {
    body: JSON.stringify(payload),
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    method: "POST",
  });
  const body = (await response.json().catch(() => null)) as {
    error?: string;
    simulation?: { id?: string };
  } | null;

  if (!response.ok || !body?.simulation?.id) {
    throw new Error(
      body?.error ?? "Nao foi possivel vincular a proposta a uma simulacao.",
    );
  }

  return body.simulation.id;
}

function buildLeadSimulationApiPayload({
  bidType,
  calculation,
  commercialData,
  formState,
  insuranceOption,
  leadProposalContext,
  presentation,
  selectedAdministrator,
  selectedScenarioKey,
  simulationName,
  simulatorInput,
}: {
  bidType: BidType;
  calculation: ReturnType<typeof calculateSimulatorScenarios>;
  commercialData: SimulatorCommercialData;
  formState: SimulatorFormState;
  insuranceOption: InsuranceOption;
  leadProposalContext: CrmLeadProposalContext;
  presentation: SimulatorCommercialPresentation;
  selectedAdministrator: SimulatorAdministrator | null;
  selectedScenarioKey: SimulatorScenarioKey;
  simulationName: string;
  simulatorInput: SimulatorInput;
}) {
  const title =
    simulationName.trim() ||
    `Simulacao comercial - ${leadProposalContext.leadName}`;

  return {
    calculationSnapshot: {
      calculation,
      selectedScenario: presentation.selectedScenario,
    },
    leadId: leadProposalContext.leadId,
    presentationSnapshot: {
      commercialData,
      leadContext: {
        createdAt: leadProposalContext.createdAt,
        intent: leadProposalContext.intent,
        leadDesiredCredit: leadProposalContext.leadDesiredCredit ?? null,
        leadName: leadProposalContext.leadName,
      },
      presentation,
    },
    simulationType: "commercial",
    source: "lead_detail",
    summary: {
      commercialCredit: presentation.commercialCredit,
      contemplationMonth: presentation.contemplationMonth,
      estimatedGain: presentation.estimatedCardSaleProfit,
      estimatedRoi: presentation.estimatedCardSaleGainRate,
      estimatedSaleValue: presentation.estimatedCardSaleValue,
      inccRate: presentation.inccRate,
      monthlyPayment: presentation.installmentBeforeContemplation,
      postContemplationPayment: presentation.installmentAfterContemplation,
      quotaCount: 1,
      totalCredit: presentation.contractedCredit,
      updatedCredit: presentation.updatedCredit,
    },
    technicalInput: {
      bidType,
      formState,
      insuranceOption,
      selectedAdministrator: selectedAdministrator
        ? {
            id: selectedAdministrator.id,
            insuranceRequired: selectedAdministrator.insuranceRequired,
            name: selectedAdministrator.name,
            parameters: selectedAdministrator.parameters,
          }
        : null,
      selectedScenarioKey,
      simulatorInput,
    },
    title,
  };
}

function buildAnchoredProposalSnapshot({
  bidType,
  commercialConsultingConditions,
  commercialData,
  formState,
  insuranceOption,
  leadProposalContext,
  proposal,
  selectedAdministrator,
}: {
  bidType: BidType;
  commercialConsultingConditions: CommercialConsultingConditionsState;
  commercialData: SimulatorCommercialData;
  formState: SimulatorFormState;
  insuranceOption: InsuranceOption;
  leadProposalContext: CrmLeadProposalContext;
  proposal: AnchoredProposal;
  selectedAdministrator: SimulatorAdministrator | null;
}) {
  return {
    input: proposal.input,
    metadata: {
      bidType,
      commercialConsultingConditions: toPdfCommercialConsultingConditions(
        commercialConsultingConditions,
      ),
      comfortableInstallment: proposal.referenceInstallment,
      distanceFromReference: proposal.distanceFromReference,
      insuranceOption,
      targetInstallment: proposal.targetInstallment,
    },
    presentation: proposal.presentation,
    simulatorState: {
      commercialData,
      formState: {
        ...formState,
        credit: String(proposal.input.credit),
      },
      selectedAdministrator: selectedAdministrator
        ? {
            id: selectedAdministrator.id,
            insuranceRequired: selectedAdministrator.insuranceRequired,
            name: selectedAdministrator.name,
            parameters: selectedAdministrator.parameters,
          }
        : null,
      selectedScenarioKey: proposal.scenarioKey,
    },
    source: {
      kind: proposal.kind,
      label: proposal.label,
      leadContext: {
        createdAt: leadProposalContext.createdAt,
        intent: leadProposalContext.intent,
        leadDesiredCredit: leadProposalContext.leadDesiredCredit ?? null,
        leadId: leadProposalContext.leadId,
        leadName: leadProposalContext.leadName,
      },
      objective: proposal.objective,
    },
  };
}

function createCommercialProposalEditorState(
  proposal: AnchoredProposal,
): CommercialProposalEditorState {
  return {
    draft: {
      bidType: proposal.presentation.bidType,
      contemplationMonth: String(proposal.presentation.contemplationMonth),
      credit: formatEditorCurrencyValue(proposal.input.credit),
      insuranceOption:
        proposal.presentation.insuranceLabel === "Sem seguro"
          ? "without-insurance"
          : "with-insurance",
      lastEditedAmountField: null,
      scenarioKey: proposal.scenarioKey,
      targetInstallment: formatEditorCurrencyValue(
        proposal.presentation.installmentBeforeContemplation,
      ),
      termMonths: String(proposal.input.termMonths),
    },
    message: "Editor aberto com os valores salvos da sugestao.",
    preview: {
      input: proposal.input,
      presentation: proposal.presentation,
      scenarioKey: proposal.scenarioKey,
    },
    sourceProposal: proposal,
    status: "idle",
  };
}

function buildEditedAnchoredProposal({
  preview,
  sourceProposal,
}: {
  preview: CommercialProposalEditorCalculationResult;
  sourceProposal: AnchoredProposal;
}): AnchoredProposal {
  return {
    ...sourceProposal,
    distanceFromReference:
      preview.presentation.installmentBeforeContemplation -
      sourceProposal.referenceInstallment,
    input: preview.input,
    presentation: preview.presentation,
    scenarioKey: preview.scenarioKey,
    targetInstallment: preview.presentation.installmentBeforeContemplation,
  };
}

function buildAnchoredProposalSummary(proposal: AnchoredProposal) {
  return {
    commercialCredit: proposal.presentation.commercialCredit,
    contemplationMonth: proposal.presentation.contemplationMonth,
    estimatedGain: proposal.presentation.estimatedCardSaleProfit,
    estimatedRoi: proposal.presentation.estimatedCardSaleGainRate,
    estimatedSaleValue: proposal.presentation.estimatedCardSaleValue,
    monthlyPayment: proposal.presentation.installmentBeforeContemplation,
    postContemplationPayment:
      proposal.presentation.installmentAfterContemplation,
  };
}

function buildAnchoredProposalName(baseName: string, proposalLabel: string) {
  const trimmedBaseName = baseName.trim();

  if (trimmedBaseName) {
    return `${trimmedBaseName} - ${proposalLabel}`;
  }

  return `Proposta ${proposalLabel}`;
}

function resolveActivePdfCommercialProposal(
  saveState: CommercialProposalSaveState,
): PdfCommercialProposalContext | undefined {
  if (!saveState.activeKind) {
    return undefined;
  }

  const activeRecord = saveState.records[saveState.activeKind];

  if (activeRecord?.status !== "success") {
    return undefined;
  }

  return activeRecord.commercialProposal;
}

function toPdfCommercialConsultingConditions(
  conditions: CommercialConsultingConditionsState,
): PdfCommercialConsultingConditions | null {
  if (!conditions.enabled) {
    return null;
  }

  const installments = parsePositiveInteger(conditions.installmentCount);
  const installmentAmount = parseCurrencyNumber(conditions.installmentAmount);

  if (!installments || installmentAmount <= 0) {
    return null;
  }

  return {
    installmentAmount,
    installments,
    totalAmount: installments * installmentAmount,
  };
}

function parsePositiveInteger(value: string) {
  const parsedValue = Number(value.replace(",", "."));

  return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : null;
}

function buildPdfCommercialProposalContext({
  commercialData,
  proposal,
  proposalId,
  title,
  variant,
}: {
  commercialData: SimulatorCommercialData;
  proposal: AnchoredProposal;
  proposalId: string;
  title: string;
  variant: CommercialProposalSaveVariant;
}): PdfCommercialProposalContext {
  return {
    kind: proposal.kind,
    proposalId,
    recommendation:
      normalizeOptionalText(commercialData.commercialNotes) ||
      normalizeOptionalText(proposal.objective),
    title,
    variant,
  };
}

function normalizeOptionalText(value: string | undefined) {
  return value?.trim() ?? "";
}

function percentToRate(value: string) {
  const normalized = Number(value.replace(",", "."));

  return Number.isFinite(normalized) && normalized >= 0 ? normalized / 100 : 0;
}

function percentFromRate(rate: number, maximumFractionDigits = 2) {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits,
    minimumFractionDigits: 0,
  }).format(rate * 100);
}

async function readSupabaseAccessToken() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !publishableKey) {
    return null;
  }

  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(supabaseUrl, publishableKey, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: true,
      persistSession: true,
    },
  });
  const { data, error } = await supabase.auth.getSession();

  if (error || !data.session?.access_token) {
    return null;
  }

  return data.session.access_token;
}
