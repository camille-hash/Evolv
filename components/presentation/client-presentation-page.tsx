"use client";

import { Minus, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { buildIntelligenceSummary } from "@/modules/intelligence";
import { loadOperations, type Operation } from "@/modules/operations";
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
  const [selectedScenarioKey, setSelectedScenarioKey] =
    useState<SimulatorScenarioKey>("full");
  const [insuranceOption, setInsuranceOption] =
    useState<InsuranceOption>("with-insurance");
  const [bidType, setBidType] = useState<BidType>("none");
  const [contemplationMonth, setContemplationMonth] = useState(1);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const loadedOperations = loadOperations();
      const loadedActiveOperation = loadedOperations[0] ?? null;

      setOperations(loadedOperations);

      if (loadedActiveOperation) {
        const simulatorInput = toSimulatorInput(loadedActiveOperation.formState);

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

  const activeOperation = operations[0] ?? null;

  const simulatorInput = useMemo(
    () => (activeOperation ? toSimulatorInput(activeOperation.formState) : null),
    [activeOperation],
  );
  const calculation = useMemo(
    () => (simulatorInput ? calculateSimulatorScenarios(simulatorInput) : null),
    [simulatorInput],
  );
  const presentation = useMemo(() => {
    if (!activeOperation || !calculation || !simulatorInput) {
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
  }

  function updateContemplationMonth(nextMonth: number) {
    setContemplationMonth(
      clampContemplationMonth(nextMonth, maxContemplationMonth),
    );
  }

  if (!activeOperation || !presentation || !simulatorInput) {
    return (
      <section className="executive-surface rounded-md p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Apresentacao ao cliente
        </p>
        <h2 className="mt-5 text-3xl font-semibold text-foreground">
          Nenhuma operacao ativa para apresentacao.
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          Crie ou selecione uma operacao na area de Simulacoes para iniciar a
          reuniao consultiva.
        </p>
      </section>
    );
  }

  return (
    <section className="grid gap-6">
      <MeetingHero operation={activeOperation} presentation={presentation} />

      <section className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <CommercialControls
          administratorName={
            activeOperation.administratorData.selectedAdministratorName ||
            activeOperation.administradora ||
            "Personalizada"
          }
          bidType={bidType}
          contemplationMonth={presentation.contemplationMonth}
          insuranceOption={insuranceOption}
          insuranceRequired={activeOperation.administratorData.insuranceRequired}
          maxContemplationMonth={maxContemplationMonth}
          onBidTypeChange={setBidType}
          onContemplationMonthChange={updateContemplationMonth}
          onInsuranceOptionChange={handleInsuranceChange}
          onScenarioChange={setSelectedScenarioKey}
          selectedScenarioKey={selectedScenarioKey}
        />

        <section className="executive-surface rounded-md p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Operacao ativa
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-foreground">
                Apresentacao consultiva
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                Os numeros abaixo reagem aos ajustes comerciais feitos durante a
                conversa.
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

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <CommercialMetric
              label="Parcela antes da contemplacao"
              value={currencyFormatter.format(
                presentation.installmentBeforeContemplation,
              )}
            />
            <CommercialMetric
              label="Parcela pos-contemplacao"
              value={currencyFormatter.format(
                presentation.installmentAfterContemplation,
              )}
            />
            <CommercialMetric
              label="Credito liquido disponivel"
              value={currencyFormatter.format(presentation.liquidCredit)}
            />
            <CommercialMetric
              label="Valor estimado de venda"
              value={currencyFormatter.format(
                presentation.estimatedCardSaleValue,
              )}
            />
            <CommercialMetric
              label="Percentual de ganho"
              value={percentFormatter.format(
                presentation.estimatedCardSaleGainRate,
              )}
            />
            <CommercialMetric
              label="Mes de contemplacao"
              value={`Mes ${presentation.contemplationMonth}`}
            />
          </div>
        </section>
      </section>

      <ScenarioComparison comparisons={scenarioComparisons} />

      {intelligenceSummary ? (
        <OpportunitySection
          executiveSummary={intelligenceSummary.executiveSummary}
          insights={intelligenceSummary.insights}
          opportunities={intelligenceSummary.opportunities}
        />
      ) : null}
    </section>
  );
}

function MeetingHero({
  operation,
  presentation,
}: {
  operation: Operation;
  presentation: SimulatorCommercialPresentation;
}) {
  return (
    <section className="executive-hero rounded-md p-7 text-primary-foreground sm:p-9">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary-foreground/70">
            EVOLV Intelligence
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-normal sm:text-5xl">
            Reuniao patrimonial
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-primary-foreground/70">
            {operation.nome} · {presentation.selectedScenarioName} ·{" "}
            {presentation.insuranceLabel}
          </p>
        </div>
        <div className="rounded-md border border-primary-foreground/14 bg-primary-foreground/8 px-4 py-3 text-sm text-primary-foreground/74">
          {presentation.bidLabel}
        </div>
      </div>

      <div className="mt-10 grid gap-4 lg:grid-cols-4">
        <HeroNumber
          label="Credito contratado"
          value={currencyFormatter.format(presentation.contractedCredit)}
        />
        <HeroNumber
          label="Investimento ate contemplacao"
          value={currencyFormatter.format(
            presentation.totalInvestedUntilContemplation,
          )}
        />
        <HeroNumber
          label="Lucro estimado"
          value={currencyFormatter.format(presentation.estimatedCardSaleProfit)}
        />
        <HeroNumber
          label="Alavancagem"
          value={`${multipleFormatter.format(presentation.leverageMultiple)}x`}
        />
      </div>
    </section>
  );
}

function CommercialControls({
  administratorName,
  bidType,
  contemplationMonth,
  insuranceOption,
  insuranceRequired,
  maxContemplationMonth,
  onBidTypeChange,
  onContemplationMonthChange,
  onInsuranceOptionChange,
  onScenarioChange,
  selectedScenarioKey,
}: {
  administratorName: string;
  bidType: BidType;
  contemplationMonth: number;
  insuranceOption: InsuranceOption;
  insuranceRequired: boolean;
  maxContemplationMonth: number;
  onBidTypeChange: (bidType: BidType) => void;
  onContemplationMonthChange: (month: number) => void;
  onInsuranceOptionChange: (insuranceOption: InsuranceOption) => void;
  onScenarioChange: (scenarioKey: SimulatorScenarioKey) => void;
  selectedScenarioKey: SimulatorScenarioKey;
}) {
  return (
    <section className="executive-surface rounded-md p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Ajustes comerciais
      </p>
      <h2 className="mt-3 text-2xl font-semibold text-foreground">
        Parametros da conversa
      </h2>

      <div className="mt-6 rounded-md border bg-background/70 p-4">
        <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
          Administradora
        </p>
        <p className="mt-2 text-xl font-semibold text-foreground">
          {administratorName}
        </p>
      </div>

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

      <ControlGroup label="Seguro">
        {insuranceOptions.map((option) => (
          <MeetingToggle
            active={insuranceOption === option.key}
            disabled={
              insuranceRequired && option.key === "without-insurance"
            }
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

      <div className="mt-6 rounded-md border bg-background/70 p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
              Mes de contemplacao
            </p>
            <p className="mt-2 text-3xl font-semibold text-foreground">
              Mes {contemplationMonth}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              aria-label="Reduzir mes de contemplacao"
              disabled={contemplationMonth <= 1}
              onClick={() => onContemplationMonthChange(contemplationMonth - 1)}
              size="sm"
              type="button"
              variant="secondary"
            >
              <Minus className="h-4 w-4" />
            </Button>
            <Button
              aria-label="Aumentar mes de contemplacao"
              disabled={contemplationMonth >= maxContemplationMonth}
              onClick={() => onContemplationMonthChange(contemplationMonth + 1)}
              size="sm"
              type="button"
              variant="secondary"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </section>
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
    <section className="executive-surface rounded-md p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Cenarios
      </p>
      <h2 className="mt-3 text-2xl font-semibold text-foreground">
        Comparativo comercial
      </h2>
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
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
                label="Lucro"
                value={currencyFormatter.format(
                  comparison.presentation.estimatedCardSaleProfit,
                )}
              />
            </div>
          </article>
        ))}
      </div>
    </section>
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

function HeroNumber({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-md border border-primary-foreground/14 bg-primary-foreground/8 p-5">
      <p className="text-xs font-medium uppercase tracking-[0.08em] text-primary-foreground/62">
        {label}
      </p>
      <p className="mt-4 text-3xl font-semibold tracking-normal text-primary-foreground">
        {value}
      </p>
    </article>
  );
}

function CommercialMetric({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-md border bg-background/70 p-4">
      <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-3 text-xl font-semibold text-foreground">{value}</p>
    </article>
  );
}

function ControlGroup({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <div className="mt-6">
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

function parsePositiveNumber(value: string) {
  const normalized = Number(value.replace(",", "."));

  return Number.isFinite(normalized) && normalized > 0 ? normalized : 0;
}

function clampContemplationMonth(month: number, termMonths: number) {
  return Math.min(Math.max(1, Math.trunc(month)), Math.max(1, termMonths));
}
