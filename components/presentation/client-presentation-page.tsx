"use client";

import { Minus, Plus } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { buildIntelligenceSummary } from "@/modules/intelligence";
import {
  loadOperations,
  saveOperation,
  type Operation,
  type OperationDraft,
} from "@/modules/operations";
import { generateSimulatorCommercialPdf } from "@/modules/reports";
import {
  buildSimulatorCommercialPresentation,
  calculateSimulatorScenarios,
  type BidType,
  type InsuranceOption,
  type SimulatorCommercialPresentation,
  type SimulatorInput,
  type SimulatorSavedFormState,
  type SimulatorScenarioKey,
} from "@/modules/simulator";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const scenarioOptions: Array<{
  key: SimulatorScenarioKey;
  label: string;
}> = [
  { key: "full", label: "Parcela Cheia" },
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

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  currency: "BRL",
  style: "currency",
});

const percentFormatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
  style: "percent",
});

const multipleFormatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

export function ClientPresentationPage() {
  const [operations, setOperations] = useState<Operation[]>([]);
  const [formState, setFormState] = useState<SimulatorSavedFormState | null>(
    null,
  );
  const [selectedScenarioKey, setSelectedScenarioKey] =
    useState<SimulatorScenarioKey>("full");
  const [insuranceOption, setInsuranceOption] =
    useState<InsuranceOption>("with-insurance");
  const [bidType, setBidType] = useState<BidType>("none");
  const [contemplationMonth, setContemplationMonth] = useState(1);
  const [technicalDetailsOpen, setTechnicalDetailsOpen] = useState(false);
  const [scenariosOpen, setScenariosOpen] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const loadedOperations = loadOperations();
      const loadedActiveOperation = resolveActiveOperation(loadedOperations);

      setOperations(loadedOperations);

      if (loadedActiveOperation) {
        const operationFormState = normalizePresentationFormState(
          loadedActiveOperation.formState,
        );
        const simulatorInput = toSimulatorInput(operationFormState);

        setFormState(operationFormState);
        setSelectedScenarioKey(loadedActiveOperation.selectedScenarioKey);
        setInsuranceOption(
          loadedActiveOperation.administratorData.insuranceRequired
            ? "with-insurance"
            : loadedActiveOperation.insuranceOption,
        );
        setBidType(loadedActiveOperation.bidType);
        setContemplationMonth(
          clampContemplationMonth(
            loadedActiveOperation.contemplationMonth,
            simulatorInput.termMonths,
          ),
        );
      }
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const activeOperation = resolveActiveOperation(operations);
  const simulatorInput = useMemo(
    () => (activeOperation && formState ? toSimulatorInput(formState) : null),
    [activeOperation, formState],
  );
  const calculation = useMemo(
    () => (simulatorInput ? calculateSimulatorScenarios(simulatorInput) : null),
    [simulatorInput],
  );
  const presentation = useMemo(() => {
    if (!activeOperation || !calculation || !simulatorInput || !formState) {
      return null;
    }

    return buildSimulatorCommercialPresentation({
      calculation,
      input: simulatorInput,
      selectedScenarioKey,
      insuranceOption,
      bidType,
      contemplationMonth,
    });
  }, [
    activeOperation,
    bidType,
    calculation,
    contemplationMonth,
    formState,
    insuranceOption,
    selectedScenarioKey,
    simulatorInput,
  ]);
  const scenarioComparisons = useMemo(() => {
    if (!calculation || !simulatorInput) {
      return [];
    }

    return scenarioOptions.map((scenario) => ({
      key: scenario.key,
      label: scenario.label,
      presentation: buildSimulatorCommercialPresentation({
        calculation,
        input: simulatorInput,
        selectedScenarioKey: scenario.key,
        insuranceOption,
        bidType,
        contemplationMonth,
      }),
    }));
  }, [bidType, calculation, contemplationMonth, insuranceOption, simulatorInput]);
  const intelligenceSummary = useMemo(() => {
    if (!activeOperation || !presentation || !simulatorInput) {
      return null;
    }

    return buildIntelligenceSummary({
      presentation,
      selectedScenarioKey,
      administratorInsuranceRequired:
        activeOperation.administratorData.insuranceRequired,
      bidType,
      embeddedBidRate: simulatorInput.embeddedBidRate ?? 0,
      cashBidRate: simulatorInput.cashBidRate ?? 0,
    });
  }, [
    activeOperation,
    bidType,
    presentation,
    selectedScenarioKey,
    simulatorInput,
  ]);
  const maxContemplationMonth = simulatorInput?.termMonths ?? 1;

  function handleInsuranceChange(nextInsuranceOption: InsuranceOption) {
    if (
      nextInsuranceOption === "without-insurance" &&
      activeOperation?.administratorData.insuranceRequired
    ) {
      return;
    }

    setInsuranceOption(nextInsuranceOption);
    persistActiveOperation({ insuranceOption: nextInsuranceOption });
  }

  function updateContemplationMonth(nextMonth: number) {
    const nextContemplationMonth = clampContemplationMonth(
      nextMonth,
      maxContemplationMonth,
    );

    setContemplationMonth(nextContemplationMonth);
    persistActiveOperation({ contemplationMonth: nextContemplationMonth });
  }

  if (!activeOperation || !presentation || !simulatorInput || !formState) {
    return (
      <section className="executive-surface rounded-md p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Simulacao Comercial
        </p>
        <h2 className="mt-5 text-3xl font-semibold text-foreground">
          Nenhuma operacao ativa para simular.
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          Crie uma operacao para iniciar a simulacao comercial consultiva.
        </p>
      </section>
    );
  }

  return (
    <section className="grid gap-6">
      <ContemplationHero
        contemplationMonth={presentation.contemplationMonth}
        maxContemplationMonth={maxContemplationMonth}
        onContemplationMonthChange={updateContemplationMonth}
        operation={activeOperation}
        presentation={presentation}
      />

      <CommercialResultGrid presentation={presentation} />

      <CollapsibleScenarios
        comparisons={scenarioComparisons}
        isOpen={scenariosOpen}
        onOpenChange={setScenariosOpen}
        onScenarioChange={handleScenarioChange}
        selectedScenarioKey={selectedScenarioKey}
      />

      <section className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <MeetingControls
          bidType={bidType}
          insuranceOption={insuranceOption}
          insuranceRequired={activeOperation.administratorData.insuranceRequired}
          onBidTypeChange={handleBidTypeChange}
          onInsuranceOptionChange={handleInsuranceChange}
        />

        <section className="executive-surface rounded-md p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Operacao ativa
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-foreground">
                Simulacao comercial ao vivo
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                Ajuste os pontos comerciais da conversa e acompanhe a resposta
                da operacao em tempo real.
              </p>
            </div>
            <Button
              onClick={() =>
                generateSimulatorCommercialPdf({
                  presentation,
                  simulationName: activeOperation.nome,
                  commercialData: activeOperation.commercialData,
                  simulationDate: activeOperation.updatedAt,
                })
              }
              type="button"
            >
              Gerar PDF da Simulacao
            </Button>
          </div>

          <TechnicalDetails
            bidType={bidType}
            formState={formState}
            insuranceOption={insuranceOption}
            isOpen={technicalDetailsOpen}
            onBidTypeChange={handleBidTypeChange}
            onFormStateChange={handleFormStateChange}
            onInsuranceOptionChange={handleInsuranceChange}
            onOpenChange={setTechnicalDetailsOpen}
            onScenarioChange={handleScenarioChange}
            operation={activeOperation}
            selectedScenarioKey={selectedScenarioKey}
          />
        </section>
      </section>

      {intelligenceSummary ? (
        <OpportunitySection
          executiveSummary={intelligenceSummary.executiveSummary}
          insights={intelligenceSummary.insights}
          opportunities={intelligenceSummary.opportunities}
        />
      ) : null}
    </section>
  );

  function handleScenarioChange(nextScenarioKey: SimulatorScenarioKey) {
    setSelectedScenarioKey(nextScenarioKey);
    persistActiveOperation({ selectedScenarioKey: nextScenarioKey });
  }

  function handleBidTypeChange(nextBidType: BidType) {
    setBidType(nextBidType);
    persistActiveOperation({ bidType: nextBidType });
  }

  function handleFormStateChange(partialFormState: Partial<SimulatorSavedFormState>) {
    if (!formState) {
      return;
    }

    const nextFormState = {
      ...formState,
      ...partialFormState,
    };

    setFormState(nextFormState);
    persistActiveOperation({ formState: nextFormState });
  }

  function persistActiveOperation(
    overrides: Partial<OperationDraft> & {
      formState?: SimulatorSavedFormState;
      selectedScenarioKey?: SimulatorScenarioKey;
      insuranceOption?: InsuranceOption;
      bidType?: BidType;
      contemplationMonth?: number;
    },
  ) {
    if (!activeOperation || !calculation || !simulatorInput || !formState) {
      return;
    }

    const nextFormState = overrides.formState ?? formState;
    const nextSimulatorInput = toSimulatorInput(nextFormState);
    const nextCalculation = calculateSimulatorScenarios(nextSimulatorInput);
    const nextScenarioKey =
      overrides.selectedScenarioKey ?? selectedScenarioKey;
    const nextInsuranceOption =
      overrides.insuranceOption ?? insuranceOption;
    const nextBidType = overrides.bidType ?? bidType;
    const nextContemplationMonth =
      overrides.contemplationMonth ?? contemplationMonth;
    const nextPresentation = buildSimulatorCommercialPresentation({
      calculation: nextCalculation,
      input: nextSimulatorInput,
      selectedScenarioKey: nextScenarioKey,
      insuranceOption: nextInsuranceOption,
      bidType: nextBidType,
      contemplationMonth: nextContemplationMonth,
    });
    const draft: OperationDraft = {
      id: activeOperation.id,
      nome: activeOperation.nome,
      formState: nextFormState,
      commercialData: activeOperation.commercialData,
      administratorData: activeOperation.administratorData,
      selectedScenarioKey: nextScenarioKey,
      insuranceOption: nextInsuranceOption,
      contemplationMonth: nextPresentation.contemplationMonth,
      bidType: nextBidType,
      status: activeOperation.status,
      tipoOperacao: activeOperation.tipoOperacao,
      createdAt: activeOperation.createdAt,
    };

    setOperations(saveOperation({ draft, presentation: nextPresentation }));
  }
}

function ContemplationHero({
  contemplationMonth,
  maxContemplationMonth,
  onContemplationMonthChange,
  operation,
  presentation,
}: {
  contemplationMonth: number;
  maxContemplationMonth: number;
  onContemplationMonthChange: (month: number) => void;
  operation: Operation;
  presentation: SimulatorCommercialPresentation;
}) {
  return (
    <section className="executive-hero rounded-md p-7 text-center text-primary-foreground sm:p-9">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="text-left">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary-foreground/70">
            EVOLV Intelligence
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-normal sm:text-4xl">
            Simulacao Comercial
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-primary-foreground/70">
            {operation.nome} - {presentation.selectedScenarioName} -{" "}
            {presentation.insuranceLabel}
          </p>
        </div>
        <div className="rounded-md border border-primary-foreground/14 bg-primary-foreground/8 px-4 py-3 text-sm text-primary-foreground/74">
          {presentation.bidLabel}
        </div>
      </div>

      <div className="mx-auto mt-10 max-w-5xl rounded-md border border-primary-foreground/14 bg-primary-foreground/8 p-6 sm:p-8">
        <p className="text-[8px] font-semibold uppercase tracking-[0.22em] text-primary-foreground/42">
          Mes de contemplacao
        </p>
        <div className="mt-5 flex items-center justify-center gap-4">
          <Button
            aria-label="Reduzir mes de contemplacao"
            className="h-12 w-12 border-primary-foreground/18 bg-primary-foreground/10 p-0 text-primary-foreground hover:bg-primary-foreground/15"
            disabled={contemplationMonth <= 1}
            onClick={() => onContemplationMonthChange(contemplationMonth - 1)}
            type="button"
            variant="secondary"
          >
            <Minus className="h-5 w-5" />
          </Button>
          <div className="min-w-40">
            <p className="text-7xl font-semibold leading-none tracking-normal sm:text-8xl">
              {contemplationMonth}
            </p>
            <p className="mt-2 text-[8px] font-medium uppercase tracking-[0.18em] text-primary-foreground/40">
              meses
            </p>
          </div>
          <Button
            aria-label="Aumentar mes de contemplacao"
            className="h-12 w-12 border-primary-foreground/18 bg-primary-foreground/10 p-0 text-primary-foreground hover:bg-primary-foreground/15"
            disabled={contemplationMonth >= maxContemplationMonth}
            onClick={() => onContemplationMonthChange(contemplationMonth + 1)}
            type="button"
            variant="secondary"
          >
            <Plus className="h-5 w-5" />
          </Button>
        </div>
        <input
          aria-label="Selecionar mes de contemplacao"
          className="mt-8 h-2 w-full accent-primary-foreground"
          max={maxContemplationMonth}
          min={1}
          onChange={(event) =>
            onContemplationMonthChange(Number(event.target.value))
          }
          type="range"
          value={contemplationMonth}
        />
        <div className="mt-3 flex justify-between text-[8px] font-medium text-primary-foreground/34">
          <span>Mes 1</span>
          <span>Mes {maxContemplationMonth}</span>
        </div>
      </div>
    </section>
  );
}

function CommercialResultGrid({
  presentation,
}: {
  presentation: SimulatorCommercialPresentation;
}) {
  return (
    <section className="executive-surface rounded-md p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Resultado comercial
      </p>
      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <CommercialMetric
          label="Credito"
          value={currencyFormatter.format(presentation.commercialCredit)}
        />
        <CommercialMetric
          label="Credito atualizado"
          value={currencyFormatter.format(presentation.updatedCredit)}
        />
        <CommercialMetric
          label="Parcela antes"
          value={currencyFormatter.format(
            presentation.installmentBeforeContemplation,
          )}
        />
        <CommercialMetric
          label="Parcela pos"
          value={currencyFormatter.format(
            presentation.installmentAfterContemplation,
          )}
        />
        <CommercialMetric
          label="Investimento ate contemplacao"
          value={currencyFormatter.format(
            presentation.totalInvestedUntilContemplation,
          )}
        />
        <CommercialMetric
          label="Venda estimada"
          value={currencyFormatter.format(presentation.estimatedCardSaleValue)}
        />
        <CommercialMetric
          label="Lucro estimado venda da carta"
          value={currencyFormatter.format(presentation.estimatedCardSaleProfit)}
        />
        <CommercialMetric
          label="Alavancagem patrimonial percentual"
          value={percentFormatter.format(presentation.estimatedCardSaleGainRate)}
        />
        <CommercialMetric
          label="Alavancagem Patrimonial"
          value={`${multipleFormatter.format(presentation.leverageMultiple)}x`}
        />
      </div>
    </section>
  );
}

function CollapsibleScenarios({
  comparisons,
  isOpen,
  onOpenChange,
  onScenarioChange,
  selectedScenarioKey,
}: {
  comparisons: Array<{
    key: SimulatorScenarioKey;
    label: string;
    presentation: SimulatorCommercialPresentation;
  }>;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onScenarioChange: (scenarioKey: SimulatorScenarioKey) => void;
  selectedScenarioKey: SimulatorScenarioKey;
}) {
  return (
    <section className="executive-surface rounded-md p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Cenarios comerciais
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-foreground">
            Simular alternativas de parcela
          </h2>
        </div>
        <button
          className="inline-flex h-10 items-center rounded-md border bg-background/70 px-4 text-sm font-medium text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
          onClick={() => onOpenChange(!isOpen)}
          type="button"
        >
          Cenarios
        </button>
      </div>

      {isOpen ? (
        <div className="mt-6 grid gap-6">
          <div className="grid gap-3 md:grid-cols-3">
            {scenarioOptions.map((scenario) => (
              <button
                className={cn(
                  "min-h-24 rounded-md border px-5 py-4 text-left transition",
                  selectedScenarioKey === scenario.key
                    ? "border-primary bg-primary text-primary-foreground"
                    : "bg-background/70 text-foreground hover:border-primary/40",
                )}
                key={scenario.key}
                onClick={() => onScenarioChange(scenario.key)}
                type="button"
              >
                <span className="text-xs font-semibold uppercase tracking-[0.12em] opacity-70">
                  Cenario
                </span>
                <span className="mt-3 block text-2xl font-semibold">
                  {scenario.label}
                </span>
              </button>
            ))}
          </div>

          <ScenarioComparison comparisons={comparisons} />
        </div>
      ) : null}
    </section>
  );
}

function MeetingControls({
  bidType,
  insuranceOption,
  insuranceRequired,
  onBidTypeChange,
  onInsuranceOptionChange,
}: {
  bidType: BidType;
  insuranceOption: InsuranceOption;
  insuranceRequired: boolean;
  onBidTypeChange: (bidType: BidType) => void;
  onInsuranceOptionChange: (insuranceOption: InsuranceOption) => void;
}) {
  return (
    <section className="executive-surface rounded-md p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Ajustes comerciais
      </p>
      <h2 className="mt-3 text-2xl font-semibold text-foreground">
        Decisoes da conversa
      </h2>

      <ControlGroup label="Seguro">
        {insuranceOptions.map((option) => (
          <MeetingToggle
            active={insuranceOption === option.key}
            disabled={insuranceRequired && option.key === "without-insurance"}
            key={option.key}
            label={option.label}
            onClick={() => onInsuranceOptionChange(option.key)}
          />
        ))}
      </ControlGroup>
      {insuranceRequired ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Seguro obrigatorio nesta administradora.
        </p>
      ) : null}

      <ControlGroup label="Tipo de lance">
        {bidOptions.map((option) => (
          <MeetingToggle
            active={bidType === option.key}
            key={option.key}
            label={option.label}
            onClick={() => onBidTypeChange(option.key)}
          />
        ))}
      </ControlGroup>
    </section>
  );
}

function TechnicalDetails({
  bidType,
  formState,
  insuranceOption,
  isOpen,
  onBidTypeChange,
  onFormStateChange,
  onInsuranceOptionChange,
  onOpenChange,
  onScenarioChange,
  operation,
  selectedScenarioKey,
}: {
  bidType: BidType;
  formState: SimulatorSavedFormState;
  insuranceOption: InsuranceOption;
  isOpen: boolean;
  onBidTypeChange: (bidType: BidType) => void;
  onFormStateChange: (formState: Partial<SimulatorSavedFormState>) => void;
  onInsuranceOptionChange: (insuranceOption: InsuranceOption) => void;
  onOpenChange: (isOpen: boolean) => void;
  onScenarioChange: (scenarioKey: SimulatorScenarioKey) => void;
  operation: Operation;
  selectedScenarioKey: SimulatorScenarioKey;
}) {
  return (
    <div className="mt-6 border-t pt-5">
      <button
        className="inline-flex h-10 items-center rounded-md border bg-background/70 px-4 text-sm font-medium text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
        onClick={() => onOpenChange(!isOpen)}
        type="button"
      >
        Dados tecnicos
      </button>

      {isOpen ? (
        <div className="mt-5 rounded-md border bg-background/70 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Apoio operacional do consultor
          </p>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <TechnicalInput
              label="Credito"
              value={formState.credit}
              onChange={(credit) => onFormStateChange({ credit })}
            />
            <TechnicalMetric
              label="Administradora"
              value={
                operation.administratorData.selectedAdministratorName ||
                operation.administradora ||
                "Personalizada"
              }
            />
            <TechnicalInput
              label="Taxa administrativa"
              value={formState.administrativeFeePercent}
              onChange={(administrativeFeePercent) =>
                onFormStateChange({ administrativeFeePercent })
              }
            />
            <TechnicalInput
              label="Fundo de reserva"
              value={formState.reserveFundPercent}
              onChange={(reserveFundPercent) =>
                onFormStateChange({ reserveFundPercent })
              }
            />
            <TechnicalInput
              label="Prazo"
              value={formState.termMonths}
              onChange={(termMonths) => onFormStateChange({ termMonths })}
            />
            <TechnicalInput
              label="Seguro"
              value={formState.monthlyInsurancePercent}
              onChange={(monthlyInsurancePercent) =>
                onFormStateChange({ monthlyInsurancePercent })
              }
            />
            <TechnicalInput
              label="INCC"
              value={formState.inccPercent}
              onChange={(inccPercent) => onFormStateChange({ inccPercent })}
            />
            <TechnicalInput
              label="Venda da carta"
              value={formState.cardSalePercent}
              onChange={(cardSalePercent) =>
                onFormStateChange({ cardSalePercent })
              }
            />
            <TechnicalInput
              label="Lance embutido"
              value={formState.embeddedBidPercent}
              onChange={(embeddedBidPercent) =>
                onFormStateChange({ embeddedBidPercent })
              }
            />
            <TechnicalInput
              label="Lance em dinheiro"
              value={formState.cashBidPercent}
              onChange={(cashBidPercent) =>
                onFormStateChange({ cashBidPercent })
              }
            />
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <ControlGroup label="Cenario">
              {scenarioOptions.map((scenario) => (
                <MeetingToggle
                  active={selectedScenarioKey === scenario.key}
                  key={scenario.key}
                  label={scenario.label}
                  onClick={() => onScenarioChange(scenario.key)}
                />
              ))}
            </ControlGroup>
            <ControlGroup label="Tipo de lance">
              {bidOptions.map((option) => (
                <MeetingToggle
                  active={bidType === option.key}
                  key={option.key}
                  label={option.label}
                  onClick={() => onBidTypeChange(option.key)}
                />
              ))}
            </ControlGroup>
            <ControlGroup label="Seguro">
              {insuranceOptions.map((option) => (
                <MeetingToggle
                  active={insuranceOption === option.key}
                  disabled={
                    operation.administratorData.insuranceRequired &&
                    option.key === "without-insurance"
                  }
                  key={option.key}
                  label={option.label}
                  onClick={() => onInsuranceOptionChange(option.key)}
                />
              ))}
            </ControlGroup>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ScenarioComparison({
  comparisons,
}: {
  comparisons: Array<{
    key: SimulatorScenarioKey;
    label: string;
    presentation: SimulatorCommercialPresentation;
  }>;
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        Comparativo comercial
      </h3>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {comparisons.map((comparison) => (
          <article
            className="rounded-md border bg-background/70 p-5"
            key={comparison.key}
          >
            <p className="text-sm font-semibold text-foreground">
              {comparison.label}
            </p>
            <div className="mt-5 grid gap-3">
              <ComparisonLine
                label="Parcela antes"
                value={currencyFormatter.format(
                  comparison.presentation.installmentBeforeContemplation,
                )}
              />
              <ComparisonLine
                label="Parcela pos"
                value={currencyFormatter.format(
                  comparison.presentation.installmentAfterContemplation,
                )}
              />
              <ComparisonLine
                label="Investimento"
                value={currencyFormatter.format(
                  comparison.presentation.totalInvestedUntilContemplation,
                )}
              />
              <ComparisonLine
                label="Lucro venda carta"
                value={currencyFormatter.format(
                  comparison.presentation.estimatedCardSaleProfit,
                )}
              />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function OpportunitySection({
  executiveSummary,
  insights,
  opportunities,
}: {
  executiveSummary: string;
  insights: string[];
  opportunities: string[];
}) {
  return (
    <section className="executive-surface rounded-md p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Oportunidade patrimonial
      </p>
      <h2 className="mt-3 text-2xl font-semibold text-foreground">
        Leitura EVOLV
      </h2>
      <p className="mt-4 max-w-4xl text-base leading-7 text-foreground">
        {executiveSummary}
      </p>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <InsightList title="Principais insights" items={insights} />
        <InsightList title="Oportunidades" items={opportunities} />
      </div>
    </section>
  );
}

function InsightList({ items, title }: { items: string[]; title: string }) {
  return (
    <article className="rounded-md border bg-background/70 p-5">
      <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {title}
      </h3>
      <div className="mt-4 grid gap-3">
        {items.length > 0 ? (
          items.map((item) => (
            <p
              className="rounded-md bg-muted/40 px-4 py-3 text-sm leading-6 text-foreground"
              key={item}
            >
              {item}
            </p>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">
            Nenhum destaque automatico para este criterio.
          </p>
        )}
      </div>
    </article>
  );
}

function CommercialMetric({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-md border bg-background/70 p-5">
      <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-3 text-2xl font-semibold text-foreground">{value}</p>
    </article>
  );
}

function TechnicalMetric({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-md border bg-card p-4">
      <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-base font-semibold text-foreground">{value}</p>
    </article>
  );
}

function TechnicalInput({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="grid gap-2 rounded-md border bg-card p-4">
      <span className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </span>
      <input
        className="h-10 rounded-md border bg-background px-3 text-sm font-semibold text-foreground outline-none transition focus:border-primary"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </label>
  );
}

function ControlGroup({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <div className="mt-6 first:mt-0">
      <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function MeetingToggle({
  active,
  disabled,
  label,
  onClick,
}: {
  active: boolean;
  disabled?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        "h-10 rounded-md border px-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-45",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
      )}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

function ComparisonLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-t pt-3 first:border-t-0 first:pt-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold text-foreground">{value}</span>
    </div>
  );
}

function resolveActiveOperation(operations: Operation[]) {
  return operations.find((operation) => operation.status === "active") ??
    operations[0] ??
    null;
}

function toSimulatorInput(formState: SimulatorSavedFormState): SimulatorInput {
  return {
    credit: parsePositiveNumber(formState.credit),
    administrativeFeeRate:
      parsePositiveNumber(formState.administrativeFeePercent) / 100,
    reserveFundRate: parsePositiveNumber(formState.reserveFundPercent) / 100,
    termMonths: Math.max(
      1,
      Math.trunc(parsePositiveNumber(formState.termMonths)),
    ),
    monthlyInsuranceRate:
      parsePositiveNumber(formState.monthlyInsurancePercent) / 100,
    inccRate: parsePositiveNumber(formState.inccPercent) / 100,
    cardSaleRate: parsePositiveNumber(formState.cardSalePercent) / 100,
    embeddedBidRate: parsePositiveNumber(formState.embeddedBidPercent) / 100,
    cashBidRate: parsePositiveNumber(formState.cashBidPercent) / 100,
  };
}

function normalizePresentationFormState(
  formState: SimulatorSavedFormState,
): SimulatorSavedFormState {
  return {
    ...formState,
    cardSalePercent: formState.cardSalePercent.trim() || "20",
  };
}

function parsePositiveNumber(value: string) {
  const normalized = Number(value.replace(",", "."));

  return Number.isFinite(normalized) && normalized > 0 ? normalized : 0;
}

function clampContemplationMonth(month: number, termMonths: number) {
  return Math.min(Math.max(1, Math.trunc(month)), Math.max(1, termMonths));
}
