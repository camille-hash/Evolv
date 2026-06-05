"use client";

import { useMemo, useState } from "react";
import { ChevronDown, FileDown, Minus, Plus } from "lucide-react";
import {
  buildSimulatorCommercialPresentation,
  calculateSimulatorScenarios,
  isSimulatorExampleValid,
  simulatorExampleInput,
  type BidType,
  type InsuranceOption,
  type SimulatorInput,
  type SimulatorScenarioKey,
} from "@/modules/simulator";
import { generateSimulatorCommercialPdf } from "@/modules/reports";
import { cn } from "@/lib/utils";

type SimulatorFormState = {
  credit: string;
  administrativeFeePercent: string;
  reserveFundPercent: string;
  termMonths: string;
  monthlyInsurancePercent: string;
  inccPercent: string;
  cardSalePercent: string;
  embeddedBidPercent: string;
  cashBidPercent: string;
};

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
  cardSalePercent: "100",
  embeddedBidPercent: "25",
  cashBidPercent: "25",
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

export function SimulatorPanel() {
  const [isTechnicalAreaOpen, setIsTechnicalAreaOpen] = useState(false);
  const [selectedScenarioKey, setSelectedScenarioKey] =
    useState<SimulatorScenarioKey>("full");
  const [insuranceOption, setInsuranceOption] =
    useState<InsuranceOption>("with-insurance");
  const [bidType, setBidType] = useState<BidType>("none");
  const [contemplationMonth, setContemplationMonth] = useState(1);
  const [formState, setFormState] =
    useState<SimulatorFormState>(initialFormState);

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
      calculation,
      bidType,
      contemplationMonth,
      insuranceOption,
      selectedScenarioKey,
      simulatorInput,
    ],
  );

  return (
    <section className="flex flex-col gap-7">
      <section className="rounded-md border bg-card text-card-foreground">
        <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="border-b p-6 sm:p-8 xl:border-b-0 xl:border-r">
            <div className="flex flex-col gap-7">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    EVOLV
                  </p>
                  <h2 className="mt-3 text-3xl font-semibold text-foreground">
                    Simulacao patrimonial
                  </h2>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                    Visao comercial da estrategia selecionada para apresentacao
                    ao cliente.
                  </p>
                </div>

                <button
                  className="inline-flex h-10 w-fit items-center gap-2 rounded-md border border-primary bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
                  onClick={() => generateSimulatorCommercialPdf(presentation)}
                  type="button"
                >
                  <FileDown className="h-4 w-4" aria-hidden="true" />
                  Gerar PDF
                </button>
              </div>

              <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-end">
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

              <div className="grid gap-3 sm:grid-cols-3">
              {scenarioOptions.map((option) => (
                <button
                  className={cn(
                    "h-11 rounded-md border px-4 text-sm font-medium transition",
                    selectedScenarioKey === option.key
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : "bg-background text-foreground hover:border-primary/40 hover:bg-accent",
                  )}
                  key={option.key}
                  onClick={() => setSelectedScenarioKey(option.key)}
                  type="button"
                >
                  {option.label}
                </button>
              ))}
            </div>

              <div className="grid gap-3 sm:grid-cols-2">
              {insuranceOptions.map((option) => (
                <button
                  className={cn(
                    "h-11 rounded-md border px-4 text-sm font-medium transition",
                    insuranceOption === option.key
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : "bg-background text-foreground hover:border-primary/40 hover:bg-accent",
                  )}
                  key={option.key}
                  onClick={() => setInsuranceOption(option.key)}
                  type="button"
                >
                  {option.label}
                </button>
              ))}
            </div>

              <div className="grid gap-3 lg:grid-cols-3">
              {bidOptions.map((option) => (
                <button
                  className={cn(
                    "h-11 rounded-md border px-4 text-sm font-medium transition",
                    bidType === option.key
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : "bg-background text-foreground hover:border-primary/40 hover:bg-accent",
                  )}
                  key={option.key}
                  onClick={() => setBidType(option.key)}
                  type="button"
                >
                  {option.label}
                </button>
              ))}
              </div>
            </div>
          </div>

          <div className="bg-muted/40 p-6 sm:p-8">
            <p className="text-sm font-medium text-muted-foreground">
              Ajuste de contemplacao
            </p>
            <div className="mt-5 flex items-center justify-between gap-3">
              <IconButton
                label="Diminuir mes"
                onClick={() => updateContemplationMonth(contemplationMonth - 1)}
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
                onClick={() => updateContemplationMonth(contemplationMonth + 1)}
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
              </IconButton>
            </div>
            <input
              className="mt-7 w-full accent-primary"
              max={simulatorInput.termMonths}
              min={1}
              onChange={(event) =>
                updateContemplationMonth(Number(event.target.value))
              }
              type="range"
              value={presentation.contemplationMonth}
            />
            <div className="mt-8 grid gap-3">
              <SummaryLine
                label="Cenario"
                value={presentation.selectedScenarioName}
              />
              <SummaryLine label="Seguro" value={presentation.insuranceLabel} />
              <SummaryLine label="Lance" value={presentation.bidLabel} />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-4">
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
          label="Valor de venda"
          value={currencyFormatter.format(presentation.estimatedCardSaleValue)}
          featured
        />
        <CommercialMetric
          label="Alavancagem"
          value={`${presentation.leverageMultiple.toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}x`}
          featured
        />
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <CommercialMetric
          label="Credito atualizado pelo INCC"
          value={currencyFormatter.format(presentation.updatedCredit)}
        />
        <CommercialMetric
          label="Credito liquido disponivel"
          value={currencyFormatter.format(presentation.liquidCredit)}
        />
        <CommercialMetric
          label="Cenario selecionado"
          value={presentation.selectedScenarioName}
        />
        <CommercialMetric
          label="Opcao de seguro"
          value={presentation.insuranceLabel}
        />
        <CommercialMetric
          label="Tipo de lance"
          value={presentation.bidLabel}
        />
        <CommercialMetric
          label="Valor do lance"
          value={currencyFormatter.format(presentation.bidAmount)}
        />
      </section>

      {presentation.installmentAfterContemplationFallback ? (
        <div className="rounded-md border bg-accent px-5 py-3 text-sm text-accent-foreground">
          A contemplacao foi selecionada no ultimo mes do prazo. A parcela
          cheia foi usada como referencia pos-contemplacao.
        </div>
      ) : null}

      <section className="rounded-md border bg-card p-6 text-card-foreground sm:p-7">
        <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Total estimado investido ate a contemplacao
            </p>
            <p className="mt-2 text-4xl font-semibold text-primary">
              {currencyFormatter.format(
                presentation.totalInvestedUntilContemplation,
              )}
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            {presentation.contemplationMonth} parcelas no cenario{" "}
            {presentation.selectedScenarioName.toLowerCase()}.
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <CommercialMetric
          label="Investimento real"
          value={currencyFormatter.format(presentation.realInvestment)}
          featured
        />
        <CommercialMetric
          label="Lucro estimado"
          value={currencyFormatter.format(presentation.estimatedCardSaleProfit)}
          featured
        />
        <CommercialMetric
          label="Percentual de ganho"
          value={percentFormatter.format(presentation.estimatedCardSaleGainRate)}
          featured
        />
      </section>

      <div className="rounded-md border bg-muted/30 text-card-foreground">
        <button
          className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
          onClick={() => setIsTechnicalAreaOpen((current) => !current)}
          type="button"
        >
          <div>
            <h2 className="text-sm font-semibold">Area tecnica</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Parametros internos da simulacao.
            </p>
          </div>
          <ChevronDown
            className={cn(
              "h-5 w-5 shrink-0 transition-transform",
              isTechnicalAreaOpen ? "rotate-180" : "rotate-0",
            )}
            aria-hidden="true"
          />
        </button>

        {isTechnicalAreaOpen ? (
          <div className="grid gap-4 border-t p-5 sm:grid-cols-2 lg:grid-cols-4">
            <SimulatorInputField
              label="Credito"
              value={formState.credit}
              onChange={(credit) => updateFormState({ credit })}
            />
            <SimulatorInputField
              label="Taxa administrativa (%)"
              value={formState.administrativeFeePercent}
              onChange={(administrativeFeePercent) =>
                updateFormState({ administrativeFeePercent })
              }
            />
            <SimulatorInputField
              label="Fundo de reserva (%)"
              value={formState.reserveFundPercent}
              onChange={(reserveFundPercent) =>
                updateFormState({ reserveFundPercent })
              }
            />
            <SimulatorInputField
              label="Prazo em meses"
              value={formState.termMonths}
              onChange={(termMonths) => updateFormState({ termMonths })}
            />
            <SimulatorInputField
              label="Seguro mensal (%)"
              value={formState.monthlyInsurancePercent}
              onChange={(monthlyInsurancePercent) =>
                updateFormState({ monthlyInsurancePercent })
              }
            />
            <SimulatorInputField
              label="INCC (%)"
              value={formState.inccPercent}
              onChange={(inccPercent) => updateFormState({ inccPercent })}
            />
            <SimulatorInputField
              label="Venda da carta (%)"
              value={formState.cardSalePercent}
              onChange={(cardSalePercent) =>
                updateFormState({ cardSalePercent })
              }
            />
            <SimulatorInputField
              label="Lance embutido (%)"
              value={formState.embeddedBidPercent}
              onChange={(embeddedBidPercent) =>
                updateFormState({ embeddedBidPercent })
              }
            />
            <SimulatorInputField
              label="Lance em dinheiro (%)"
              value={formState.cashBidPercent}
              onChange={(cashBidPercent) =>
                updateFormState({ cashBidPercent })
              }
            />
            <div className="rounded-md border bg-background p-3 text-sm">
              <p className="font-medium">Validacao da especificacao</p>
              <p
                className={cn(
                  "mt-1 font-semibold",
                  isSimulatorExampleValid()
                    ? "text-emerald-700"
                    : "text-destructive",
                )}
              >
                {isSimulatorExampleValid()
                  ? "Resultados conferidos"
                  : "Resultados divergentes"}
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );

  function updateFormState(partialState: Partial<SimulatorFormState>) {
    setFormState((current) => ({ ...current, ...partialState }));
  }

  function updateContemplationMonth(nextMonth: number) {
    setContemplationMonth(
      Math.min(Math.max(1, Math.trunc(nextMonth)), simulatorInput.termMonths),
    );
  }
}

function CommercialMetric({
  label,
  value,
  featured = false,
}: {
  label: string;
  value: string;
  featured?: boolean;
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

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b pb-3 text-sm last:border-b-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

function IconButton({
  label,
  children,
  onClick,
}: {
  label: string;
  children: React.ReactNode;
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
