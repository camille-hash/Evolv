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
  buildCrmSalesDashboard,
  loadCrmActivities,
  loadCrmLeads,
  loadCrmMonthlyGoal,
  loadCrmPipelineConfig,
  saveCrmMonthlyGoal,
  summarizeCrmPipeline,
  toCrmPipelineDefinitions,
  type CrmActivity,
  type CrmConfigurablePipeline,
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
  const [crmActivities, setCrmActivities] = useState<CrmActivity[]>([]);
  const [crmMonthlyGoal, setCrmMonthlyGoal] = useState(0);
  const [crmPipelineConfig, setCrmPipelineConfig] = useState<
    CrmConfigurablePipeline[]
  >([]);

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
      setCrmActivities(loadCrmActivities());
      setCrmMonthlyGoal(loadCrmMonthlyGoal());
      setCrmPipelineConfig(loadCrmPipelineConfig());
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
  const crmDashboard = useMemo(
    () =>
      buildCrmSalesDashboard({
        activities: crmActivities,
        leads: crmLeads,
        monthlyGoal: crmMonthlyGoal,
        pipelineDefinitions: toCrmPipelineDefinitions(crmPipelineConfig),
      }),
    [crmActivities, crmLeads, crmMonthlyGoal, crmPipelineConfig],
  );
  const crmExecutive = useMemo(
    () => buildCommercialExecutiveDashboard(crmLeads),
    [crmLeads],
  );
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

      <section className="executive-surface rounded-md p-5 text-card-foreground sm:p-6">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Dashboard Executivo Comercial
            </p>
            <h2 className="mt-2 text-xl font-semibold text-foreground">
              Saude do funil e prioridades de gestao
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Visao consolidada para identificar gargalos, valor em jogo e
              oportunidades que precisam de acao.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <DashboardDetail
            label="Leads ativos"
            value={String(crmDashboard.activeLeadsCount)}
          />
          <DashboardDetail
            label="Leads ganhos"
            value={String(crmDashboard.wonOpportunitiesCount)}
          />
          <DashboardDetail
            label="Leads perdidos"
            value={String(crmDashboard.lostOpportunitiesCount)}
          />
          <DashboardDetail
            label="Valor ativo"
            value={currencyFormatter.format(crmDashboard.activePotentialValue)}
          />
          <DashboardDetail
            label="Valor ganho"
            value={currencyFormatter.format(crmDashboard.wonPotentialValue)}
          />
          <DashboardDetail
            label="Valor perdido"
            value={currencyFormatter.format(crmDashboard.lostPotentialValue)}
          />
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-md border bg-background/70 p-4">
            <h3 className="text-sm font-semibold text-foreground">
              Conversao do funil
            </h3>
            <div className="mt-4 grid gap-2">
              {crmExecutive.funnelSteps.map((step, index) => (
                <div key={step.label}>
                  <div className="flex items-center justify-between gap-4 rounded-md border bg-card px-3 py-2">
                    <span className="text-sm font-medium text-foreground">
                      {step.label}
                    </span>
                    <span className="rounded-full border bg-background px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                      {step.count}
                    </span>
                  </div>
                  {index < crmExecutive.funnelSteps.length - 1 ? (
                    <div className="ml-4 h-4 border-l border-border" />
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4">
            <CrmListCard title="Gargalos do processo">
              <DashboardDetail
                label="Maior volume"
                value={formatBottleneck(crmExecutive.bottlenecks.highestVolume)}
              />
              <DashboardDetail
                label="Maior permanencia"
                value={formatBottleneck(crmExecutive.bottlenecks.highestStaleness)}
              />
              <DashboardDetail
                label="Maior concentracao de perdas"
                value={formatBottleneck(crmExecutive.bottlenecks.highestLoss)}
              />
            </CrmListCard>

            <CrmListCard title="Oportunidades prioritarias">
              <DashboardDetail
                label="Quentes"
                value={String(crmExecutive.priorities.hot.length)}
              />
              <DashboardDetail
                label="Acoes vencidas"
                value={String(crmExecutive.priorities.overdue.length)}
              />
              <DashboardDetail
                label="Maior valor ativo"
                value={
                  crmExecutive.priorities.highestValue[0]
                    ? `${crmExecutive.priorities.highestValue[0].nome} - ${currencyFormatter.format(
                        crmExecutive.priorities.highestValue[0].valorPretendido,
                      )}`
                    : "Sem oportunidade ativa"
                }
              />
            </CrmListCard>
          </div>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-3">
          <CrmListCard title="Responsaveis com mais leads ativos">
            {crmExecutive.consultantRankingByCount.length ? (
              crmExecutive.consultantRankingByCount.map((item) => (
                <DashboardDetail
                  key={item.consultor}
                  label={item.consultor}
                  value={`${item.count} leads`}
                />
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                Nenhum lead ativo no momento.
              </p>
            )}
          </CrmListCard>

          <CrmListCard title="Responsaveis por valor em pipeline">
            {crmExecutive.consultantRankingByValue.length ? (
              crmExecutive.consultantRankingByValue.map((item) => (
                <DashboardDetail
                  key={item.consultor}
                  label={item.consultor}
                  value={currencyFormatter.format(item.value)}
                />
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                Nenhum valor ativo no pipeline.
              </p>
            )}
          </CrmListCard>

          <CrmListCard title="Maiores valores ativos">
            {crmExecutive.priorities.highestValue.length ? (
              crmExecutive.priorities.highestValue.map((lead) => (
                <DashboardDetail
                  key={lead.id}
                  label={lead.nome}
                  value={currencyFormatter.format(lead.valorPretendido)}
                />
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                Nenhuma oportunidade ativa com valor.
              </p>
            )}
          </CrmListCard>
        </div>
      </section>

      <section className="executive-surface rounded-md p-5 text-card-foreground sm:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              CRM Operacional
            </p>
            <h2 className="mt-2 text-xl font-semibold text-foreground">
              Rotina comercial do dia
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Visao rapida de acoes, valor em negociacao, andamento do funil e
              meta mensal.
            </p>
          </div>

          <label className="grid gap-2 text-sm font-medium text-foreground xl:min-w-[260px]">
            <span>Meta mensal de vendas</span>
            <input
              className="w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/15"
              min={0}
              onChange={(event) =>
                setCrmMonthlyGoal(
                  saveCrmMonthlyGoal(Number(event.target.value)),
                )
              }
              type="number"
              value={crmMonthlyGoal}
            />
          </label>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <DashboardDetail
            label="Meta mensal"
            value={currencyFormatter.format(crmDashboard.monthlyGoal)}
          />
          <DashboardDetail
            label="Valor em negociacao"
            value={currencyFormatter.format(crmDashboard.activePotentialValue)}
          />
          <DashboardDetail
            label="Valor ganho"
            value={currencyFormatter.format(crmDashboard.wonPotentialValue)}
          />
          <DashboardDetail
            label="Valor perdido"
            value={currencyFormatter.format(crmDashboard.lostPotentialValue)}
          />
          <DashboardDetail
            label="Diferenca para a meta"
            value={currencyFormatter.format(crmDashboard.goalGap)}
          />
          <DashboardDetail
            label="Percentual atingido"
            value={percentFormatter.format(crmDashboard.goalCompletionRate)}
          />
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-3">
          <div className="rounded-md border bg-background/70 p-4">
            <h3 className="text-sm font-semibold text-foreground">
              Resumo Operacional
            </h3>
            <div className="mt-4 grid gap-3">
              <DashboardDetail
                label="Oportunidades ativas"
                value={String(crmDashboard.activeLeadsCount)}
              />
              <DashboardDetail
                label="Oportunidades ganhas"
                value={String(crmDashboard.wonOpportunitiesCount)}
              />
              <DashboardDetail
                label="Oportunidades perdidas"
                value={String(crmDashboard.lostOpportunitiesCount)}
              />
              <DashboardDetail
                label="Atividades pendentes"
                value={String(crmDashboard.pendingActivitiesCount)}
              />
              <DashboardDetail
                label="Acoes vencidas"
                value={String(crmDashboard.overdueActionsCount)}
              />
              <DashboardDetail
                label="Valor potencial ativo"
                value={currencyFormatter.format(
                  crmDashboard.activePotentialValue,
                )}
              />
            </div>
          </div>

          <div className="rounded-md border bg-background/70 p-4">
            <h3 className="text-sm font-semibold text-foreground">
              Leads por Pipeline
            </h3>
            <div className="mt-4 grid gap-3">
              {crmDashboard.pipelineSummaries.map((pipeline) => (
                <DashboardDetail
                  key={pipeline.id}
                  label={pipeline.nome}
                  value={String(pipeline.count)}
                />
              ))}
            </div>
          </div>

          <div className="rounded-md border bg-background/70 p-4">
            <h3 className="text-sm font-semibold text-foreground">
              Temperatura dos Leads
            </h3>
            <div className="mt-4 grid gap-3">
              <DashboardDetail
                label="Frios"
                value={String(crmDashboard.leadsByTemperature.fria)}
              />
              <DashboardDetail
                label="Mornos"
                value={String(crmDashboard.leadsByTemperature.morna)}
              />
              <DashboardDetail
                label="Quentes"
                value={String(crmDashboard.leadsByTemperature.quente)}
              />
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-3">
          <CrmListCard title="Origens dos Leads">
            {crmDashboard.originRanking.map((item) => (
              <DashboardDetail
                key={item.origin}
                label={item.origin}
                value={String(item.count)}
              />
            ))}
          </CrmListCard>

          <CrmListCard title="Proximas Acoes">
            {crmDashboard.nextActions.length ? (
              crmDashboard.nextActions.slice(0, 5).map((action) => (
                <DashboardDetail
                  key={`${action.leadId}-${action.date}-${action.action}`}
                  label={`${action.leadName} - ${action.action}`}
                  value={formatDateOnly(action.date)}
                />
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                Nenhuma proxima acao preenchida.
              </p>
            )}
          </CrmListCard>

          <CrmListCard title="Atencao">
            {crmDashboard.overdueActions.length ? (
              crmDashboard.overdueActions.slice(0, 5).map((action) => (
                <DashboardDetail
                  key={`${action.leadId}-${action.date}-${action.action}`}
                  label={`${action.leadName} - ${action.action}`}
                  value={formatDateOnly(action.date)}
                />
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                Nenhuma acao vencida.
              </p>
            )}
          </CrmListCard>
        </div>
      </section>

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
              label="Ativas"
              value={String(crmDashboard.opportunitiesByStatus.ativa)}
            />
            <DashboardDetail
              label="Ganhas"
              value={String(crmDashboard.opportunitiesByStatus.ganha)}
            />
            <DashboardDetail
              label="Perdidas"
              value={String(crmDashboard.opportunitiesByStatus.perdida)}
            />
            {crmDashboard.pipelineSummaries.map((pipeline) => (
              <DashboardDetail
                key={pipeline.id}
                label={pipeline.nome}
                value={String(pipeline.count)}
              />
            ))}
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
                latestSimulation.results.commercialCredit,
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

function CrmListCard({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <div className="rounded-md border bg-background/70 p-4">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <div className="mt-4 grid gap-3">{children}</div>
    </div>
  );
}

type CommercialBottleneck = {
  count: number;
  label: string;
  suffix?: string;
};

function buildCommercialExecutiveDashboard(leads: CrmLead[]) {
  const activeLeads = leads.filter((lead) => lead.status === "ativa");
  const funnelSteps = [
    { label: "Novos", match: ["novos"] },
    { label: "Abertura", match: ["abertura"] },
    { label: "Conexao", match: ["conexao", "conexão"] },
    { label: "Green Flag", match: ["green flag", "green-flag"] },
    { label: "Documentacao", match: ["documentacao", "documentação"] },
  ].map((step) => ({
    count: activeLeads.filter((lead) =>
      step.match.some((candidate) => normalizeDashboardText(lead.etapa) === normalizeDashboardText(candidate)),
    ).length,
    label: step.label,
  }));

  funnelSteps.push({
    count: leads.filter((lead) => lead.status === "ganha").length,
    label: "Ganho",
  });

  return {
    bottlenecks: {
      highestLoss: buildHighestStageCount(
        leads.filter((lead) => lead.status === "perdida"),
      ),
      highestStaleness: buildHighestStaleness(activeLeads),
      highestVolume: buildHighestStageCount(activeLeads),
    },
    consultantRankingByCount: buildConsultantRanking(activeLeads, "count"),
    consultantRankingByValue: buildConsultantRanking(activeLeads, "value"),
    funnelSteps,
    priorities: {
      highestValue: [...activeLeads]
        .filter((lead) => lead.valorPretendido > 0)
        .sort((left, right) => right.valorPretendido - left.valorPretendido)
        .slice(0, 5),
      hot: activeLeads
        .filter((lead) => lead.temperatura === "quente")
        .slice(0, 5),
      overdue: activeLeads
        .filter((lead) => isDashboardDateBeforeToday(lead.dataProximaAcao))
        .slice(0, 5),
    },
  };
}

function buildHighestStageCount(leads: CrmLead[]): CommercialBottleneck | null {
  const counts = leads.reduce<Record<string, number>>((summary, lead) => {
    const label = lead.etapa || "Etapa nao informada";

    return {
      ...summary,
      [label]: (summary[label] ?? 0) + 1,
    };
  }, {});

  return (
    Object.entries(counts)
      .map(([label, count]) => ({ count, label }))
      .sort((left, right) => right.count - left.count)[0] ?? null
  );
}

function buildHighestStaleness(leads: CrmLead[]): CommercialBottleneck | null {
  const byStage = leads.reduce<
    Record<string, { count: number; totalDays: number }>
  >((summary, lead) => {
    const label = lead.etapa || "Etapa nao informada";
    const staleDays = getDaysSince(lead.updatedAt);

    if (staleDays === null) {
      return summary;
    }

    return {
      ...summary,
      [label]: {
        count: (summary[label]?.count ?? 0) + 1,
        totalDays: (summary[label]?.totalDays ?? 0) + staleDays,
      },
    };
  }, {});

  return (
    Object.entries(byStage)
      .map(([label, value]) => ({
        count: Math.round(value.totalDays / value.count),
        label,
        suffix: "dias medios sem atualizacao",
      }))
      .sort((left, right) => right.count - left.count)[0] ?? null
  );
}

function buildConsultantRanking(
  leads: CrmLead[],
  mode: "count" | "value",
) {
  const ranking = leads.reduce<
    Record<string, { consultor: string; count: number; value: number }>
  >((summary, lead) => {
    const consultor = lead.consultor || "Sem responsavel";
    const current = summary[consultor] ?? {
      consultor,
      count: 0,
      value: 0,
    };

    return {
      ...summary,
      [consultor]: {
        consultor,
        count: current.count + 1,
        value: current.value + lead.valorPretendido,
      },
    };
  }, {});

  return Object.values(ranking)
    .sort((left, right) =>
      mode === "count" ? right.count - left.count : right.value - left.value,
    )
    .slice(0, 5);
}

function formatBottleneck(bottleneck: CommercialBottleneck | null) {
  if (!bottleneck) {
    return "Sem dados suficientes";
  }

  return bottleneck.suffix
    ? `${bottleneck.label} - ${bottleneck.count} ${bottleneck.suffix}`
    : `${bottleneck.label} - ${bottleneck.count}`;
}

function isDashboardDateBeforeToday(value: string) {
  if (!value) {
    return false;
  }

  const target = new Date(`${value}T00:00:00`).getTime();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return Number.isFinite(target) && target < today.getTime();
}

function getDaysSince(value: string) {
  const target = new Date(value).getTime();

  if (!Number.isFinite(target)) {
    return null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return Math.max(
    0,
    Math.floor((today.getTime() - target) / (1000 * 60 * 60 * 24)),
  );
}

function normalizeDashboardText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
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

function formatDateOnly(date: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
  }).format(new Date(`${date}T00:00:00`));
}
