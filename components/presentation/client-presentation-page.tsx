"use client";

import { useEffect, useMemo, useState } from "react";
import {
  emptyClientContext,
  loadClientContext,
  type ClientContext,
} from "@/modules/client-context";
import {
  consolidatePortfolio,
  loadPortfolioSnapshot,
  type PortfolioSnapshot,
} from "@/modules/portfolio";
import {
  buildPortfolioIntelligence,
  portfolioExpansionPotentialLabels,
} from "@/modules/portfolio-intelligence";
import { loadOperations, type Operation } from "@/modules/operations";
import {
  buildConsultativeRecommendations,
  buildRecommendationWealthInput,
  calculateRecommendationJourneySpeed,
} from "@/modules/recommendations";
import { buildStrategicRoadmap } from "@/modules/roadmap";
import {
  buildSimulatorCommercialPresentation,
  calculateSimulatorScenarios,
  loadSavedSimulations,
  type SimulatorCommercialPresentation,
  type SimulatorInput,
  type SimulatorSavedFormState,
} from "@/modules/simulator";
import { generateSimulatorCommercialPdf } from "@/modules/reports";
import {
  listStrategies,
  strategyTypeLabels,
  type Strategy,
} from "@/modules/strategies";
import {
  buildWealthEvolution,
  buildWealthJourney,
  loadWealthEvolutionInput,
  type WealthEvolutionInput,
} from "@/modules/wealth";
import { cn } from "@/lib/utils";

type PresentationSection =
  | "opening"
  | "today"
  | "goal"
  | "strategy"
  | "simulation"
  | "operations"
  | "results"
  | "next";

const presentationSections: Array<{
  key: PresentationSection;
  label: string;
}> = [
  { key: "opening", label: "1. Abertura" },
  { key: "today", label: "2. Hoje" },
  { key: "goal", label: "3. Meta" },
  { key: "strategy", label: "4. Estrategia" },
  { key: "simulation", label: "5. Simulacao" },
  { key: "operations", label: "6. Operacoes" },
  { key: "results", label: "7. Resultado" },
  { key: "next", label: "8. Proximos passos" },
];

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
  const [activeSection, setActiveSection] =
    useState<PresentationSection>("opening");
  const [clientContext, setClientContext] =
    useState<ClientContext>(emptyClientContext);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [portfolioSnapshot, setPortfolioSnapshot] =
    useState<PortfolioSnapshot>(emptyPortfolioSnapshot);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [wealthInput, setWealthInput] =
    useState<WealthEvolutionInput>(emptyWealthInput);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setClientContext(loadClientContext());
      setOperations(loadOperations());
      setPortfolioSnapshot(loadPortfolioSnapshot());
      setStrategies(listStrategies());
      setWealthInput(loadWealthEvolutionInput());
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const activeStrategy = strategies[0] ?? null;
  const activeOperation = operations[0] ?? null;
  const activeOperationPresentation = useMemo(
    () => (activeOperation ? buildOperationPresentation(activeOperation) : null),
    [activeOperation],
  );
  const presentationWealthInput = useMemo(
    () => buildRecommendationWealthInput({ clientContext, wealthInput }),
    [clientContext, wealthInput],
  );
  const wealthEvolution = useMemo(
    () => buildWealthEvolution(presentationWealthInput),
    [presentationWealthInput],
  );
  const wealthJourney = useMemo(
    () =>
      buildWealthJourney({
        evolution: wealthEvolution,
        input: presentationWealthInput,
      }),
    [presentationWealthInput, wealthEvolution],
  );
  const portfolioConsolidation = useMemo(
    () => consolidatePortfolio(portfolioSnapshot),
    [portfolioSnapshot],
  );
  const portfolioIntelligence = useMemo(
    () =>
      buildPortfolioIntelligence({
        snapshot: portfolioSnapshot,
        wealthCompletionRate: wealthEvolution.wealth.completionRate,
      }),
    [portfolioSnapshot, wealthEvolution.wealth.completionRate],
  );
  const roadmap = useMemo(
    () =>
      buildStrategicRoadmap({
        activeStrategy,
        clientContext,
        operations,
        wealthInput: presentationWealthInput,
      }),
    [activeStrategy, clientContext, operations, presentationWealthInput],
  );
  const journeySpeed = calculateRecommendationJourneySpeed({
    missingWealth: wealthJourney.missingWealth,
    termMonths: wealthEvolution.wealth.termMonths,
  });
  const recommendations = useMemo(
    () =>
      buildConsultativeRecommendations({
        clientContext,
        activeStrategy,
        latestSimulation: loadSavedSimulations()[0] ?? null,
        wealthJourney,
        wealthProgress: wealthEvolution.wealth,
        passiveIncomeProgress: wealthEvolution.passiveIncome,
        journeySpeed,
      }),
    [
      activeStrategy,
      clientContext,
      journeySpeed,
      wealthEvolution.passiveIncome,
      wealthEvolution.wealth,
      wealthJourney,
    ],
  );

  return (
    <section className="grid gap-6">
      <nav className="flex gap-2 overflow-x-auto pb-1">
        {presentationSections.map((section) => (
          <button
            className={cn(
              "h-10 shrink-0 rounded-md border px-3 text-sm font-medium transition",
              activeSection === section.key
                ? "border-primary bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
            )}
            key={section.key}
            onClick={() => setActiveSection(section.key)}
            type="button"
          >
            {section.label}
          </button>
        ))}
      </nav>

      {activeSection === "opening" ? (
        <PresentationHero
          activeStrategy={activeStrategy}
          clientContext={clientContext}
        />
      ) : null}

      {activeSection === "today" ? (
        <PresentationSlide
          eyebrow="Onde estamos hoje"
          title="A posicao atual do cliente."
          description="Uma leitura objetiva da base patrimonial antes das proximas decisoes."
        >
          <PresentationMetric
            label="Patrimonio atual"
            value={currencyFormatter.format(wealthJourney.currentWealth)}
          />
          <PresentationMetric
            label="Renda passiva atual"
            value={currencyFormatter.format(wealthJourney.currentPassiveIncome)}
          />
          <PresentationMetric
            label="Carteira consolidada"
            value={currencyFormatter.format(
              portfolioConsolidation.patrimonioConsolidado,
            )}
          />
          <PresentationMetric
            label="EVOLV Score"
            value={`${portfolioIntelligence.evolvScore}/100`}
          />
        </PresentationSlide>
      ) : null}

      {activeSection === "goal" ? (
        <PresentationSlide
          eyebrow="Para onde vamos"
          title="A meta patrimonial como destino."
          description="O plano conecta patrimonio, renda e marcos intermediarios em uma jornada unica."
        >
          <PresentationMetric
            label="Meta patrimonial"
            value={currencyFormatter.format(wealthJourney.targetWealth)}
          />
          <PresentationMetric
            label="Meta de renda"
            value={currencyFormatter.format(wealthJourney.targetPassiveIncome)}
          />
          <PresentationMetric
            label="Proximo marco"
            value={
              wealthJourney.nextWealthMilestone
                ? currencyFormatter.format(wealthJourney.nextWealthMilestone.value)
                : "Meta atingida"
            }
          />
          <PresentationMetric
            label="Prazo"
            value={`${wealthEvolution.wealth.termMonths} meses`}
          />
        </PresentationSlide>
      ) : null}

      {activeSection === "strategy" ? (
        <PresentationSlide
          eyebrow="Estrategia recomendada"
          title={activeStrategy?.name ?? "Estrategia ainda nao cadastrada."}
          description={
            activeStrategy?.objective ??
            "Cadastre uma estrategia para orientar as proximas operacoes patrimoniais."
          }
        >
          <PresentationMetric
            label="Tipo"
            value={
              activeStrategy
                ? strategyTypeLabels[activeStrategy.type]
                : "Nao definido"
            }
          />
          <PresentationMetric
            label="Descricao"
            value={activeStrategy?.description || "Nao informada"}
          />
          <PresentationMetric
            label="Observacoes"
            value={activeStrategy?.notes || "Sem observacoes"}
          />
        </PresentationSlide>
      ) : null}

      {activeSection === "simulation" ? (
        <SimulationPresentationSlide
          operation={activeOperation}
          presentation={activeOperationPresentation}
        />
      ) : null}

      {activeSection === "operations" ? (
        <PresentationSlide
          eyebrow="Operacoes planejadas"
          title="Portfolio de operacoes patrimoniais."
          description="As operacoes deixam de ser calculadoras isoladas e passam a compor um plano."
        >
          <div className="grid gap-3 md:col-span-2 xl:col-span-4">
            {operations.length > 0 ? (
              operations.map((operation) => (
                <OperationPresentationCard
                  key={operation.id}
                  operation={operation}
                />
              ))
            ) : (
              <PresentationEmpty text="Nenhuma operacao planejada." />
            )}
          </div>
        </PresentationSlide>
      ) : null}

      {activeSection === "results" ? (
        <PresentationSlide
          eyebrow="Resultado esperado"
          title="O que falta para a evolucao planejada."
          description="Indicadores simples para orientar a conversa de proximos movimentos."
        >
          <PresentationMetric
            label="Patrimonio faltante"
            value={currencyFormatter.format(wealthJourney.missingWealth)}
          />
          <PresentationMetric
            label="Cartas necessarias"
            value={String(wealthJourney.requiredLetters)}
          />
          <PresentationMetric
            label="Imoveis necessarios"
            value={String(wealthJourney.requiredProperties)}
          />
          <PresentationMetric
            label="Velocidade mensal"
            value={currencyFormatter.format(journeySpeed)}
          />
          <PresentationMetric
            label="Potencial de expansao"
            value={
              portfolioExpansionPotentialLabels[
                portfolioIntelligence.potencialExpansao
              ]
            }
          />
        </PresentationSlide>
      ) : null}

      {activeSection === "next" ? (
        <PresentationSlide
          eyebrow="Proximos passos"
          title="Movimentos recomendados para avancar."
          description={`Proxima etapa do roadmap: ${
            roadmap.nextStep?.nome ?? "Meta Patrimonial"
          }.`}
        >
          <div className="grid gap-3 md:col-span-2 xl:col-span-4">
            {recommendations.slice(0, 5).map((recommendation) => (
              <article
                className="rounded-md border bg-background/70 p-5"
                key={recommendation.id}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  {recommendation.priority}
                </p>
                <p className="mt-2 text-base leading-7 text-foreground">
                  {recommendation.text}
                </p>
              </article>
            ))}
          </div>
        </PresentationSlide>
      ) : null}
    </section>
  );
}

function SimulationPresentationSlide({
  operation,
  presentation,
}: {
  operation: Operation | null;
  presentation: SimulatorCommercialPresentation | null;
}) {
  if (!operation || !presentation) {
    return (
      <PresentationSlide
        eyebrow="Simulacao"
        title="Nenhuma operacao ativa para apresentar."
        description="Crie uma operacao no workspace de Simulacoes para exibir a leitura comercial ao cliente."
      >
        <div className="md:col-span-2 xl:col-span-4">
          <PresentationEmpty text="A simulacao comercial aparecera aqui quando houver uma operacao cadastrada." />
        </div>
      </PresentationSlide>
    );
  }

  return (
    <PresentationSlide
      eyebrow="Simulacao"
      title="Leitura comercial da operacao atual."
      description="Resumo da simulacao em linguagem executiva, sem parametros tecnicos internos."
      action={
        <button
          className="inline-flex h-10 items-center justify-center rounded-md border border-primary bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
          onClick={() =>
            generateSimulatorCommercialPdf({
              presentation,
              simulationName: operation.nome,
              commercialData: operation.commercialData,
              simulationDate: operation.updatedAt,
            })
          }
          type="button"
        >
          Gerar PDF da Simulacao
        </button>
      }
    >
      <PresentationMetric
        label="Administradora"
        value={operation.administradora || "Nao definida"}
      />
      <PresentationMetric
        label="Credito contratado"
        value={currencyFormatter.format(presentation.contractedCredit)}
      />
      <PresentationMetric
        label="Cenario selecionado"
        value={presentation.selectedScenarioName}
      />
      <PresentationMetric
        label="Opcao de seguro"
        value={presentation.insuranceLabel}
      />
      <PresentationMetric label="Tipo de lance" value={presentation.bidLabel} />
      <PresentationMetric
        label="Mes de contemplacao"
        value={`Mes ${presentation.contemplationMonth}`}
      />
      <PresentationMetric
        label="Parcela antes"
        value={currencyFormatter.format(
          presentation.installmentBeforeContemplation,
        )}
      />
      <PresentationMetric
        label="Parcela pos"
        value={currencyFormatter.format(
          presentation.installmentAfterContemplation,
        )}
      />
      <PresentationMetric
        label="Credito liquido"
        value={currencyFormatter.format(presentation.liquidCredit)}
      />
      <PresentationMetric
        label="Venda estimada"
        value={currencyFormatter.format(presentation.estimatedCardSaleValue)}
      />
      <PresentationMetric
        label="Lucro estimado"
        value={currencyFormatter.format(presentation.estimatedCardSaleProfit)}
      />
      <PresentationMetric
        label="Percentual de ganho"
        value={percentFormatter.format(presentation.estimatedCardSaleGainRate)}
      />
      <PresentationMetric
        label="Multiplo de alavancagem"
        value={`${multipleFormatter.format(presentation.leverageMultiple)}x`}
      />
    </PresentationSlide>
  );
}

function PresentationHero({
  activeStrategy,
  clientContext,
}: {
  activeStrategy: Strategy | null;
  clientContext: ClientContext;
}) {
  return (
    <section className="executive-hero min-h-[560px] rounded-md p-7 text-primary-foreground sm:p-10">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary-foreground/70">
        EVOLV Intelligence
      </p>
      <h2 className="mt-8 max-w-4xl text-5xl font-semibold tracking-normal">
        Planejamento Patrimonial
      </h2>
      <div className="mt-12 grid gap-4 md:grid-cols-3">
        <PresentationHeroMetric
          label="Cliente"
          value={clientContext.nome || "Cliente nao informado"}
        />
        <PresentationHeroMetric
          label="Perfil"
          value={clientContext.perfil || "Perfil nao definido"}
        />
        <PresentationHeroMetric
          label="Estrategia ativa"
          value={activeStrategy?.name ?? "Nao definida"}
        />
      </div>
    </section>
  );
}

function PresentationSlide({
  action,
  children,
  description,
  eyebrow,
  title,
}: {
  action?: React.ReactNode;
  children: React.ReactNode;
  description: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <section className="executive-surface min-h-[560px] rounded-md p-7 text-card-foreground sm:p-10">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {eyebrow}
      </p>
      <h2 className="mt-5 max-w-4xl text-4xl font-semibold tracking-normal text-foreground">
        {title}
      </h2>
      <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground">
        {description}
      </p>
      {action ? <div className="mt-6">{action}</div> : null}
      <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {children}
      </div>
    </section>
  );
}

function PresentationMetric({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-md border bg-background/70 p-5">
      <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-3 text-2xl font-semibold text-foreground">{value}</p>
    </article>
  );
}

function PresentationHeroMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <article className="rounded-md border border-primary-foreground/14 bg-primary-foreground/8 p-5">
      <p className="text-xs font-medium uppercase tracking-[0.08em] text-primary-foreground/62">
        {label}
      </p>
      <p className="mt-3 text-2xl font-semibold text-primary-foreground">
        {value}
      </p>
    </article>
  );
}

function OperationPresentationCard({ operation }: { operation: Operation }) {
  return (
    <article className="rounded-md border bg-background/70 p-5">
      <div className="grid gap-4 md:grid-cols-4">
        <PresentationInline label="Nome" value={operation.nome} />
        <PresentationInline
          label="Administradora"
          value={operation.administradora}
        />
        <PresentationInline
          label="Credito"
          value={currencyFormatter.format(operation.credito)}
        />
        <PresentationInline label="Status" value={operation.status} />
      </div>
    </article>
  );
}

function PresentationInline({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium text-foreground">{value}</p>
    </div>
  );
}

function PresentationEmpty({ text }: { text: string }) {
  return (
    <div className="rounded-md border border-dashed bg-background/70 p-5 text-sm text-muted-foreground">
      {text}
    </div>
  );
}

function buildOperationPresentation(operation: Operation) {
  const simulatorInput = toSimulatorInput(operation.formState);
  const calculation = calculateSimulatorScenarios(simulatorInput);

  return buildSimulatorCommercialPresentation({
    calculation,
    input: simulatorInput,
    selectedScenarioKey: operation.selectedScenarioKey,
    insuranceOption: operation.insuranceOption,
    bidType: operation.bidType,
    contemplationMonth: operation.contemplationMonth,
  });
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
