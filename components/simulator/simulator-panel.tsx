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
  type SimulatorAdministrator,
  type SimulatorCommercialPresentation,
  type SimulatorCommercialData,
  type SimulatorInput,
  type SimulatorSavedAdministratorData,
  type SimulatorSavedFormState,
  type SimulatorSavedSimulation,
  type SimulatorScenarioKey,
} from "@/modules/simulator";
import { generateSimulatorCommercialPdf } from "@/modules/reports";
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
  const [contemplationMonth, setContemplationMonth] = useState(1);
  const [comfortableInstallment, setComfortableInstallment] = useState("");
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

    const desiredCredit = leadProposalContext.leadDesiredCredit;
    const contextSignature = `${leadProposalContext.leadId}:${leadProposalContext.createdAt}`;

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

  return (
    <section className="flex flex-col gap-6">
      {activePage === "simulation" ? (
        <SimulationOperationPanel
          activeSimulationId={activeSimulationId}
          bidType={bidType}
          commercialData={commercialData}
          formState={formState}
          insuranceOption={insuranceOption}
          intelligenceSummary={intelligenceSummary}
          presentation={presentation}
          selectedAdministrator={selectedAdministrator}
          selectedScenarioKey={selectedScenarioKey}
          simulationName={simulationName}
          simulatorInput={simulatorInput}
          anchoredProposals={anchoredProposals}
          comfortableInstallment={comfortableInstallment}
          leadProposalContext={leadProposalContext}
          personalizationSource={personalizationSource}
          onCommercialDataChange={updateCommercialData}
          onContemplationMonthChange={updateContemplationMonth}
          onFormStateChange={updateFormState}
          onCustomizeAnchoredProposal={handleCustomizeAnchoredProposal}
          onGenerateAnchoredProposals={handleGenerateAnchoredProposals}
          onGeneratePdf={handleGeneratePdf}
          onInsuranceOptionChange={handleSelectInsuranceOption}
          onSaveAnchoredProposal={handleSaveAnchoredProposal}
          onSaveSimulation={handleSaveSimulation}
          onScenarioChange={setSelectedScenarioKey}
          onSetComfortableInstallment={setComfortableInstallment}
          onSetBidType={handleSetBidType}
          onSetSimulationName={setSimulationName}
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
    </section>
  );

  function updateFormState(partialState: Partial<SimulatorFormState>) {
    setAnchoredProposals([]);
    setFormState((current) => ({ ...current, ...partialState }));
  }

  function updateCommercialData(partialState: Partial<SimulatorCommercialData>) {
    setCommercialData((current) => ({ ...current, ...partialState }));
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
    generateSimulatorCommercialPdf({
      presentation,
      simulationName,
      commercialData,
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

  function handleGenerateAnchoredProposals() {
    const referenceInstallment = parseCurrencyNumber(comfortableInstallment);

    setPersonalizationSource(null);
    setAnchoredProposals(
      buildAnchoredProposals({
        referenceInstallment,
        calculation,
        input: simulatorInput,
        insuranceOption,
        bidType,
        contemplationMonth: presentation.contemplationMonth,
      }),
    );
  }

  function handleSaveAnchoredProposal(proposal: AnchoredProposal) {
    const savedSimulation = persistAnchoredProposal(proposal);

    setSavedSimulations(loadSavedSimulations());
    setSimulationName((currentName) => currentName || savedSimulation.name);
    linkSimulationToLeadContext(savedSimulation);
  }

  function handleCustomizeAnchoredProposal(proposal: AnchoredProposal) {
    const sourceSimulation = persistAnchoredProposal(proposal);

    setActiveSimulationId(null);
    setSimulationName(`${sourceSimulation.name} - Ajuste Comercial`);
    setSelectedScenarioKey(proposal.scenarioKey);
    setContemplationMonth(proposal.presentation.contemplationMonth);
    setPersonalizationSource({
      proposalLabel: proposal.label,
      sourceName: sourceSimulation.name,
      sourceSimulationId: sourceSimulation.id,
    });
    setSavedSimulations(loadSavedSimulations());
  }

  function persistAnchoredProposal(proposal: AnchoredProposal) {
    const administratorData = selectedAdministrator
      ? createSavedAdministratorData(selectedAdministrator)
      : createDefaultSavedAdministratorData();

    return saveSimulation({
      id: null,
      draft: {
        name: buildAnchoredProposalName(simulationName, proposal.label),
        formState,
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
  formState,
  insuranceOption,
  intelligenceSummary,
  presentation,
  selectedAdministrator,
  selectedScenarioKey,
  simulationName,
  simulatorInput,
  anchoredProposals,
  comfortableInstallment,
  leadProposalContext,
  personalizationSource,
  onCommercialDataChange,
  onContemplationMonthChange,
  onCustomizeAnchoredProposal,
  onFormStateChange,
  onGenerateAnchoredProposals,
  onGeneratePdf,
  onInsuranceOptionChange,
  onSaveAnchoredProposal,
  onSaveSimulation,
  onScenarioChange,
  onSetComfortableInstallment,
  onSetBidType,
  onSetSimulationName,
  onClearLeadProposalContext,
  isInsuranceOptionDisabled,
}: {
  activeSimulationId: string | null;
  bidType: BidType;
  commercialData: SimulatorCommercialData;
  formState: SimulatorFormState;
  insuranceOption: InsuranceOption;
  intelligenceSummary: IntelligenceSummary;
  presentation: ReturnType<typeof buildSimulatorCommercialPresentation>;
  selectedAdministrator: SimulatorAdministrator | null;
  selectedScenarioKey: SimulatorScenarioKey;
  simulationName: string;
  simulatorInput: SimulatorInput;
  anchoredProposals: AnchoredProposal[];
  comfortableInstallment: string;
  leadProposalContext?: CrmLeadProposalContext | null;
  personalizationSource: AnchoredPersonalizationSource | null;
  onCommercialDataChange: (state: Partial<SimulatorCommercialData>) => void;
  onContemplationMonthChange: (month: number) => void;
  onCustomizeAnchoredProposal: (proposal: AnchoredProposal) => void;
  onFormStateChange: (state: Partial<SimulatorFormState>) => void;
  onGenerateAnchoredProposals: () => void;
  onGeneratePdf: () => void;
  onInsuranceOptionChange: (option: InsuranceOption) => void;
  onSaveAnchoredProposal: (proposal: AnchoredProposal) => void;
  onSaveSimulation: () => void;
  onScenarioChange: (scenario: SimulatorScenarioKey) => void;
  onSetComfortableInstallment: (value: string) => void;
  onSetBidType: (bidType: BidType) => void;
  onSetSimulationName: (name: string) => void;
  onClearLeadProposalContext?: () => void;
  isInsuranceOptionDisabled: (option: InsuranceOption) => boolean;
}) {
  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
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
              </div>
              {onClearLeadProposalContext ? (
                <SecondaryActionButton onClick={onClearLeadProposalContext}>
                  Encerrar contexto do lead
                </SecondaryActionButton>
              ) : null}
            </div>
          ) : null}

          <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-end">
            <div>
              <p className="text-sm text-muted-foreground">
                Credito contratado
              </p>
              <p className="mt-2 text-4xl font-semibold tracking-normal text-foreground">
                {currencyFormatter.format(presentation.contractedCredit)}
              </p>
            </div>
            <div className="rounded-md border bg-background p-4">
              <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
                Contemplacao
              </p>
              <p className="mt-2 text-2xl font-semibold">
                Mes {presentation.contemplationMonth}
              </p>
            </div>
          </div>
        </section>

        <CommercialDataSection
          commercialData={commercialData}
          onChange={onCommercialDataChange}
        />

        <AnchoredProposalsSection
          comfortableInstallment={comfortableInstallment}
          isHighlighted={leadProposalContext?.intent === "proposal"}
          proposals={anchoredProposals}
          onComfortableInstallmentChange={onSetComfortableInstallment}
          onCustomizeProposal={onCustomizeAnchoredProposal}
          onGenerate={onGenerateAnchoredProposals}
          onSaveProposal={onSaveAnchoredProposal}
        />

      </div>

      <aside className="grid gap-5">
        <section className="rounded-md border bg-card p-5 text-card-foreground">
          <h3 className="text-sm font-semibold">Cenario</h3>
          <div className="mt-4 grid gap-3">
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
          <h3 className="text-sm font-semibold">Seguro</h3>
          {selectedAdministrator?.insuranceRequired ? (
            <p className="mt-2 text-xs font-medium text-primary">
              Seguro obrigatorio nesta administradora.
            </p>
          ) : null}
          <div className="mt-4 grid gap-3">
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
        </section>

        <section className="rounded-md border bg-card p-5 text-card-foreground">
          <h3 className="text-sm font-semibold">Lance</h3>
          <div className="mt-4 grid gap-3">
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
        </section>

        <section className="rounded-md border bg-card p-5 text-card-foreground">
          <h3 className="text-sm font-semibold">Mes de contemplacao</h3>
          <div className="mt-5 flex items-center justify-between gap-3">
            <IconButton
              label="Diminuir mes"
              onClick={() =>
                onContemplationMonthChange(presentation.contemplationMonth - 1)
              }
            >
              <Minus className="h-4 w-4" aria-hidden="true" />
            </IconButton>
            <div className="min-w-28 text-center">
              <div className="text-4xl font-semibold text-foreground">
                {presentation.contemplationMonth}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                de {simulatorInput.termMonths} meses
              </div>
            </div>
            <IconButton
              label="Aumentar mes"
              onClick={() =>
                onContemplationMonthChange(presentation.contemplationMonth + 1)
              }
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
            </IconButton>
          </div>
          <input
            className="mt-7 w-full accent-primary"
            max={simulatorInput.termMonths}
            min={1}
            onChange={(event) =>
              onContemplationMonthChange(Number(event.target.value))
            }
            type="range"
            value={presentation.contemplationMonth}
          />
        </section>

        <section className="rounded-md border bg-primary/[0.03] p-5 text-card-foreground">
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
            Resumo EVOLV
          </p>
          <p className="mt-3 text-sm leading-6 text-foreground">
            {intelligenceSummary.executiveSummary}
          </p>
        </section>

        <section className="rounded-md border bg-card p-5 text-card-foreground">
          <SimulatorInputField
            label="Credito"
            value={formState.credit}
            onChange={(credit) => onFormStateChange({ credit })}
          />
        </section>
      </aside>
    </section>
  );
}

function AnchoredProposalsSection({
  comfortableInstallment,
  isHighlighted = false,
  proposals,
  onComfortableInstallmentChange,
  onCustomizeProposal,
  onGenerate,
  onSaveProposal,
}: {
  comfortableInstallment: string;
  isHighlighted?: boolean;
  proposals: AnchoredProposal[];
  onComfortableInstallmentChange: (value: string) => void;
  onCustomizeProposal: (proposal: AnchoredProposal) => void;
  onGenerate: () => void;
  onSaveProposal: (proposal: AnchoredProposal) => void;
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
            Ancoragem comercial
          </p>
          <h2 className="mt-2 text-base font-semibold">
            Gerador de propostas
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
          {proposals.map((proposal) => (
            <article
              className="grid gap-4 rounded-md border bg-background p-4"
              key={proposal.kind}
            >
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
                  {proposal.label}
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {proposal.objective}
                </p>
              </div>

              <div className="grid gap-3 text-sm">
                <AnchoredProposalValue
                  label="Credito"
                  value={currencyFormatter.format(
                    proposal.presentation.contractedCredit,
                  )}
                />
                <AnchoredProposalValue
                  label="Parcela"
                  value={currencyFormatter.format(
                    proposal.presentation.installmentBeforeContemplation,
                  )}
                  featured
                />
                <AnchoredProposalValue
                  label="Cenario"
                  value={proposal.presentation.selectedScenarioName}
                />
                <AnchoredProposalValue
                  label="Parcela pos"
                  value={currencyFormatter.format(
                    proposal.presentation.installmentAfterContemplation,
                  )}
                />
                <AnchoredProposalValue
                  label="Venda estimada"
                  value={currencyFormatter.format(
                    proposal.presentation.estimatedCardSaleValue,
                  )}
                />
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <SecondaryActionButton onClick={() => onCustomizeProposal(proposal)}>
                  Personalizar
                </SecondaryActionButton>
                <SecondaryActionButton onClick={() => onSaveProposal(proposal)}>
                  <Save className="h-4 w-4" aria-hidden="true" />
                  Salvar proposta
                </SecondaryActionButton>
              </div>
            </article>
          ))}
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
          label="Credito contratado"
          value={currencyFormatter.format(presentation.contractedCredit)}
          featured
        />
        <CommercialMetric
          label="Credito atualizado"
          value={currencyFormatter.format(presentation.updatedCredit)}
        />
        <CommercialMetric
          label="Credito liquido"
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
          label="Lucro"
          value={currencyFormatter.format(presentation.estimatedCardSaleProfit)}
          featured
        />
        <CommercialMetric
          label="Percentual de ganho"
          value={percentFormatter.format(presentation.estimatedCardSaleGainRate)}
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
                    simulation.results.contractedCredit,
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
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-primary bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function SecondaryActionButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      className="inline-flex h-10 items-center justify-center gap-2 rounded-md border bg-background px-4 text-sm font-medium transition hover:border-primary/40 hover:bg-accent"
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

function buildAnchoredProposalName(baseName: string, proposalLabel: string) {
  const trimmedBaseName = baseName.trim();

  if (trimmedBaseName) {
    return `${trimmedBaseName} - ${proposalLabel}`;
  }

  return `Proposta ${proposalLabel}`;
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
