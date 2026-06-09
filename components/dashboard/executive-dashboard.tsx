"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Plus } from "lucide-react";
import { PortfolioIntelligencePanel } from "@/components/portfolio-intelligence/portfolio-intelligence-panel";
import { RecommendationsPanel } from "@/components/recommendations/recommendations-panel";
import { WealthMilestoneTimeline } from "@/components/wealth/wealth-milestone-timeline";
import {
  buildWealthEvolution,
  buildWealthJourney,
  loadWealthEvolutionInput,
  type WealthEvolutionInput,
} from "@/modules/wealth";
import {
  loadSavedSimulations,
  type SimulatorSavedSimulation,
} from "@/modules/simulator";
import {
  listStrategies,
  strategyTypeLabels,
  type Strategy,
} from "@/modules/strategies";
import type { ClientContext } from "@/modules/client-context";
import {
  buildConsultativeRecommendations,
  buildRecommendationWealthInput,
  calculateRecommendationJourneySpeed,
} from "@/modules/recommendations";
import {
  loadPortfolioConsolidation,
  loadPortfolioSnapshot,
  type PortfolioConsolidation,
  type PortfolioSnapshot,
} from "@/modules/portfolio";
import { buildPortfolioIntelligence } from "@/modules/portfolio-intelligence";
import {
  loadOperations,
  summarizeOperations,
  type Operation,
} from "@/modules/operations";
import {
  loadFollowUpEvents,
  summarizeFollowUpEvents,
  type FollowUpEvent,
} from "@/modules/followup";
import {
  loadCrmLeads,
  summarizeCrmPipeline,
  type CrmLead,
} from "@/modules/crm";
import { buildStrategicRoadmap } from "@/modules/roadmap";
import { generateEvolvMasterReport } from "@/modules/reports";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const compactCurrencyFormatter = new Intl.NumberFormat("pt-BR", {
  currency: "BRL",
  maximumFractionDigits: 0,
  notation: "compact",
  style: "currency",
});

const percentFormatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 1,
  minimumFractionDigits: 1,
  style: "percent",
});

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

const emptyPortfolioConsolidation: PortfolioConsolidation = {
  totalImoveis: 0,
  totalCartas: 0,
  patrimonioConsolidado: 0,
  rendaPassivaConsolidada: 0,
};

const emptyPortfolioSnapshot: PortfolioSnapshot = {
  properties: [],
  letters: [],
};

export function ExecutiveDashboard({
  clientContext,
  onCreateSimulation,
}: {
  clientContext: ClientContext;
  onCreateSimulation: () => void;
}) {
  const [savedSimulations, setSavedSimulations] = useState<
    SimulatorSavedSimulation[]
  >([]);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [wealthInput, setWealthInput] =
    useState<WealthEvolutionInput>(emptyWealthInput);
  const [portfolioConsolidation, setPortfolioConsolidation] =
    useState<PortfolioConsolidation>(emptyPortfolioConsolidation);
  const [portfolioSnapshot, setPortfolioSnapshot] =
    useState<PortfolioSnapshot>(emptyPortfolioSnapshot);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [followUpEvents, setFollowUpEvents] = useState<FollowUpEvent[]>([]);
  const [crmLeads, setCrmLeads] = useState<CrmLead[]>([]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSavedSimulations(loadSavedSimulations());
      setStrategies(listStrategies());
      setWealthInput(loadWealthEvolutionInput());
      setPortfolioConsolidation(loadPortfolioConsolidation());
      setPortfolioSnapshot(loadPortfolioSnapshot());
      setOperations(loadOperations());
      setFollowUpEvents(loadFollowUpEvents());
      setCrmLeads(loadCrmLeads());
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const dashboardWealthInput = useMemo(
    () => buildRecommendationWealthInput({ clientContext, wealthInput }),
    [clientContext, wealthInput],
  );
  const wealthEvolution = useMemo(
    () => buildWealthEvolution(dashboardWealthInput),
    [dashboardWealthInput],
  );
  const wealthJourney = useMemo(
    () =>
      buildWealthJourney({
        evolution: wealthEvolution,
        input: dashboardWealthInput,
      }),
    [dashboardWealthInput, wealthEvolution],
  );
  const latestSimulation = savedSimulations[0];
  const activeStrategy = strategies[0];
  const cappedWealthCompletion = Math.min(wealthJourney.completionRate, 1);
  const passiveIncomeCompletion =
    wealthEvolution.passiveIncome.completionRate;
  const cappedPassiveIncomeCompletion = Math.min(passiveIncomeCompletion, 1);
  const journeySpeed = calculateRecommendationJourneySpeed({
    missingWealth: wealthJourney.missingWealth,
    termMonths: wealthEvolution.wealth.termMonths,
  });
  const recommendations = useMemo(
    () =>
      buildConsultativeRecommendations({
        clientContext,
        activeStrategy,
        latestSimulation: latestSimulation ?? null,
        wealthJourney,
        wealthProgress: wealthEvolution.wealth,
        passiveIncomeProgress: wealthEvolution.passiveIncome,
        journeySpeed,
      }),
    [
      activeStrategy,
      clientContext,
      journeySpeed,
      latestSimulation,
      wealthEvolution.passiveIncome,
      wealthEvolution.wealth,
      wealthJourney,
    ],
  );
  const portfolioIntelligence = useMemo(
    () =>
      buildPortfolioIntelligence({
        snapshot: portfolioSnapshot,
        wealthCompletionRate: wealthEvolution.wealth.completionRate,
      }),
    [portfolioSnapshot, wealthEvolution.wealth.completionRate],
  );
  const operationsSummary = useMemo(
    () => summarizeOperations(operations),
    [operations],
  );
  const followUpSummary = useMemo(
    () => summarizeFollowUpEvents(followUpEvents),
    [followUpEvents],
  );
  const crmSummary = useMemo(() => summarizeCrmPipeline(crmLeads), [crmLeads]);
  const roadmap = useMemo(
    () =>
      buildStrategicRoadmap({
        clientContext,
        operations,
        activeStrategy,
        wealthInput: dashboardWealthInput,
      }),
    [activeStrategy, clientContext, dashboardWealthInput, operations],
  );

  return (
    <section className="grid gap-6">
      <section className="executive-hero overflow-hidden rounded-md p-6 text-primary-foreground sm:p-8">
        <div className="flex flex-col gap-7 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3">
              <div className="brand-mark border-brand-gold/60 bg-primary-foreground/8">
                EV
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary-foreground/70">
                Inteligencia Patrimonial
              </p>
            </div>
            <h1 className="mt-6 text-4xl font-semibold tracking-normal sm:text-5xl">
              EVOLV Intelligence
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-primary-foreground/78">
              Planejamento patrimonial. Estrategias de crescimento. Evolucao de
              patrimonio.
            </p>
          </div>

          <button
            className="inline-flex h-11 w-fit items-center justify-center gap-2 rounded-md border border-brand-gold/50 bg-brand-gold px-4 text-sm font-medium text-brand-ink transition hover:bg-brand-gold/90"
            onClick={onCreateSimulation}
            type="button"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Criar simulacao
          </button>
          <button
            className="inline-flex h-11 w-fit items-center justify-center rounded-md border border-primary-foreground/18 bg-primary-foreground/8 px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary-foreground/14"
            onClick={() => generateEvolvMasterReport(clientContext)}
            type="button"
          >
            Gerar Dossie EVOLV
          </button>
        </div>

        <div className="mt-10 grid gap-3 md:grid-cols-3">
          <HeroMetric
            label="Patrimonio atual"
            value={currencyFormatter.format(wealthJourney.currentWealth)}
          />
          <HeroMetric
            label="Meta patrimonial"
            value={currencyFormatter.format(wealthJourney.targetWealth)}
          />
          <HeroMetric
            label="Progresso"
            value={percentFormatter.format(wealthJourney.completionRate)}
          />
        </div>

        <div className="mt-7">
          <div className="mb-3 flex items-center justify-between gap-4 text-sm text-primary-foreground/82">
            <span className="font-medium">
              {percentFormatter.format(wealthJourney.completionRate)} concluido
            </span>
            <span>{percentFormatter.format(wealthJourney.remainingRate)} restante</span>
          </div>
          <div className="h-4 overflow-hidden rounded-full bg-primary-foreground/14">
            <div
              className="h-full rounded-full bg-brand-gold transition-all"
              style={{ width: `${cappedWealthCompletion * 100}%` }}
            />
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <HeroMetric
            label="Patrimonio faltante"
            value={currencyFormatter.format(wealthJourney.missingWealth)}
          />
          <HeroMetric
            label="Prazo da meta"
            value={`${wealthEvolution.wealth.termMonths} meses`}
          />
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <HeroInsight
            label="Estrategia Atual"
            title={activeStrategy?.name ?? "Nenhuma estrategia cadastrada"}
            description={
              activeStrategy
                ? strategyTypeLabels[activeStrategy.type]
                : "Cadastre uma estrategia para orientar o plano patrimonial."
            }
          />
          <HeroInsight
            label="Proximo Marco Patrimonial"
            title={
              wealthJourney.nextWealthMilestone
                ? currencyFormatter.format(wealthJourney.nextWealthMilestone.value)
                : "Meta atingida"
            }
            description={
              wealthJourney.nextWealthMilestone
                ? `${currencyFormatter.format(
                    wealthJourney.nextWealthMilestone.missingValue,
                  )} ate o proximo marco.`
                : "Nao ha marco pendente acima do patrimonio atual."
            }
          />
        </div>
      </section>

      <section className="executive-surface rounded-md p-5 text-card-foreground sm:p-6">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Cliente atual
          </p>
          <h2 className="text-xl font-semibold text-foreground">
            {clientContext.nome || "Nenhum cliente informado"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {clientContext.perfil || "Perfil ainda nao definido"}
          </p>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <DashboardDetail
            label="Patrimonio Atual"
            value={currencyFormatter.format(wealthJourney.currentWealth)}
          />
          <DashboardDetail
            label="Meta Patrimonial"
            value={currencyFormatter.format(wealthJourney.targetWealth)}
          />
          <DashboardDetail
            label="Renda Atual"
            value={currencyFormatter.format(wealthJourney.currentPassiveIncome)}
          />
          <DashboardDetail
            label="Meta de Renda"
            value={currencyFormatter.format(wealthJourney.targetPassiveIncome)}
          />
        </div>
      </section>

      <WealthMilestoneTimeline
        compact
        currentWealth={wealthJourney.currentWealth}
      />

      <RecommendationsPanel recommendations={recommendations.slice(0, 5)} />

      <PortfolioIntelligencePanel
        intelligence={portfolioIntelligence}
        title="Saude Patrimonial"
      />

      <section className="grid gap-4 xl:grid-cols-3">
        <ExecutiveCard title="Carteira Consolidada">
          <div className="grid gap-4">
            <DashboardDetail
              label="Imoveis"
              value={String(portfolioConsolidation.totalImoveis)}
            />
            <DashboardDetail
              label="Cartas"
              value={String(portfolioConsolidation.totalCartas)}
            />
            <DashboardDetail
              label="Patrimonio consolidado"
              value={currencyFormatter.format(
                portfolioConsolidation.patrimonioConsolidado,
              )}
            />
            <DashboardDetail
              label="Renda passiva consolidada"
              value={currencyFormatter.format(
                portfolioConsolidation.rendaPassivaConsolidada,
              )}
            />
          </div>
        </ExecutiveCard>

        <ExecutiveCard title="Operacoes Ativas">
          <div className="grid gap-4">
            <DashboardDetail
              label="Quantidade"
              value={String(operationsSummary.activeOperationsCount)}
            />
            <DashboardDetail
              label="Patrimonio potencial agregado"
              value={currencyFormatter.format(operationsSummary.potentialPatrimony)}
            />
            <DashboardDetail
              label="Credito total contratado"
              value={currencyFormatter.format(
                operationsSummary.totalContractedCredit,
              )}
            />
          </div>
        </ExecutiveCard>

        <ExecutiveCard title="Roadmap">
          <div className="grid gap-4">
            <DashboardDetail
              label="Quantidade de etapas"
              value={String(roadmap.steps.length)}
            />
            <DashboardDetail
              label="Proxima etapa"
              value={roadmap.nextStep?.nome ?? "Meta Patrimonial"}
            />
            <DashboardDetail
              label="Meta final"
              value={currencyFormatter.format(roadmap.finalGoal.metaPatrimonial)}
            />
          </div>
        </ExecutiveCard>

        <ExecutiveCard title="Proximos Eventos">
          <div className="grid gap-4">
            <DashboardDetail
              label="Pendentes"
              value={String(followUpSummary.pendingCount)}
            />
            <DashboardDetail
              label="Proximo evento"
              value={followUpSummary.nextEvent?.titulo ?? "Nenhum evento"}
            />
            <DashboardDetail
              label="Dias restantes"
              value={
                followUpSummary.daysUntilNextEvent === null
                  ? "-"
                  : formatDaysRemaining(followUpSummary.daysUntilNextEvent)
              }
            />
          </div>
        </ExecutiveCard>

        <ExecutiveCard title="Funil Comercial">
          <div className="grid gap-4">
            <DashboardDetail
              label="Total de leads"
              value={String(crmSummary.totalLeads)}
            />
            <DashboardDetail
              label="Prospeccao"
              value={String(crmSummary.prospecting)}
            />
            <DashboardDetail label="Vendas" value={String(crmSummary.sales)} />
            <DashboardDetail
              label="Administrativo"
              value={String(crmSummary.administrative)}
            />
            <DashboardDetail label="Perdidos" value={String(crmSummary.lost)} />
          </div>
        </ExecutiveCard>

        <ExecutiveCard title="Estrategia Ativa">
          {activeStrategy ? (
            <div className="grid gap-4">
              <DashboardDetail label="Nome" value={activeStrategy.name} />
              <DashboardDetail
                label="Tipo"
                value={strategyTypeLabels[activeStrategy.type]}
              />
              <DashboardDetail
                label="Objetivo"
                value={activeStrategy.objective}
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhuma estrategia cadastrada.
            </p>
          )}
        </ExecutiveCard>

        <ExecutiveCard title="Proximo marco patrimonial">
          <p className="text-sm text-muted-foreground">Marco</p>
          <p className="mt-2 text-3xl font-semibold text-primary">
            {wealthJourney.nextWealthMilestone
              ? currencyFormatter.format(wealthJourney.nextWealthMilestone.value)
              : "Meta atingida"}
          </p>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            {wealthJourney.nextWealthMilestone
              ? `${currencyFormatter.format(
                  wealthJourney.nextWealthMilestone.missingValue,
                )} ate o proximo marco.`
              : "Nao ha marco pendente acima do patrimonio atual."}
          </p>
        </ExecutiveCard>

        <ExecutiveCard title="Renda passiva">
          <div className="grid gap-4">
            <DashboardDetail
              label="Renda atual"
              value={currencyFormatter.format(
                wealthJourney.currentPassiveIncome,
              )}
            />
            <DashboardDetail
              label="Meta de renda"
              value={currencyFormatter.format(wealthJourney.targetPassiveIncome)}
            />
            <DashboardDetail
              label="Valor faltante"
              value={currencyFormatter.format(wealthJourney.missingPassiveIncome)}
            />
          </div>
          <div className="mt-5">
            <div className="mb-2 flex justify-between text-sm">
              <span className="font-medium text-foreground">
                {percentFormatter.format(passiveIncomeCompletion)}
              </span>
              <span className="text-muted-foreground">concluido</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${cappedPassiveIncomeCompletion * 100}%` }}
              />
            </div>
          </div>
        </ExecutiveCard>

        <ExecutiveCard title="Velocidade da jornada">
          <p className="text-3xl font-semibold text-foreground">
            {compactCurrencyFormatter.format(journeySpeed)}
            <span className="text-base font-medium text-muted-foreground">
              /mes
            </span>
          </p>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            Necessario evoluir {currencyFormatter.format(journeySpeed)} por mes
            para atingir a meta no prazo.
          </p>
        </ExecutiveCard>
      </section>

      <section className="executive-surface rounded-md p-5 text-card-foreground sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold">Ultima simulacao</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Registro mais recente do historico local.
            </p>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden />
        </div>

        {latestSimulation ? (
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <DashboardDetail label="Nome" value={latestSimulation.name} />
            <DashboardDetail
              label="Administradora"
              value={latestSimulation.administratorData.selectedAdministratorName}
            />
            <DashboardDetail
              label="Credito"
              value={currencyFormatter.format(
                latestSimulation.results.contractedCredit,
              )}
            />
            <DashboardDetail
              label="Mes contemplacao"
              value={`Mes ${latestSimulation.contemplationMonth}`}
            />
            <DashboardDetail
              label="Lucro estimado"
              value={currencyFormatter.format(
                latestSimulation.results.estimatedCardSaleProfit,
              )}
            />
          </div>
        ) : (
          <div className="mt-5 rounded-md border border-dashed bg-background p-5 text-sm text-muted-foreground">
            Nenhuma simulacao registrada.
          </div>
        )}
      </section>
    </section>
  );
}

function HeroMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-primary-foreground/14 bg-primary-foreground/8 p-4">
      <p className="text-xs font-medium uppercase tracking-[0.08em] text-primary-foreground/62">
        {label}
      </p>
      <p className="mt-2 text-xl font-semibold text-primary-foreground">
        {value}
      </p>
    </div>
  );
}

function HeroInsight({
  description,
  label,
  title,
}: {
  description: string;
  label: string;
  title: string;
}) {
  return (
    <article className="rounded-md border border-primary-foreground/14 bg-primary-foreground/8 p-4">
      <p className="text-xs font-medium uppercase tracking-[0.08em] text-primary-foreground/62">
        {label}
      </p>
      <p className="mt-2 text-lg font-semibold text-primary-foreground">
        {title}
      </p>
      <p className="mt-2 text-sm leading-6 text-primary-foreground/72">
        {description}
      </p>
    </article>
  );
}

function ExecutiveCard({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <article className="executive-surface rounded-md p-5 text-card-foreground sm:p-6">
      <h2 className="text-base font-semibold">{title}</h2>
      <div className="mt-5">{children}</div>
    </article>
  );
}

function DashboardDetail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium text-foreground">{value}</p>
    </div>
  );
}

function formatDaysRemaining(days: number) {
  if (days === 0) {
    return "Hoje";
  }

  if (days > 0) {
    return `${days} dias`;
  }

  return `${Math.abs(days)} dias em atraso`;
}
