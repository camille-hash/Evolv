"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Plus } from "lucide-react";
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

export function ExecutiveDashboard({
  onCreateSimulation,
}: {
  onCreateSimulation: () => void;
}) {
  const [savedSimulations, setSavedSimulations] = useState<
    SimulatorSavedSimulation[]
  >([]);
  const [wealthInput, setWealthInput] =
    useState<WealthEvolutionInput>(emptyWealthInput);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSavedSimulations(loadSavedSimulations());
      setWealthInput(loadWealthEvolutionInput());
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const wealthEvolution = useMemo(
    () => buildWealthEvolution(wealthInput),
    [wealthInput],
  );
  const wealthJourney = useMemo(
    () => buildWealthJourney({ evolution: wealthEvolution, input: wealthInput }),
    [wealthEvolution, wealthInput],
  );
  const latestSimulation = savedSimulations[0];
  const cappedWealthCompletion = Math.min(wealthJourney.completionRate, 1);
  const passiveIncomeCompletion =
    wealthEvolution.passiveIncome.completionRate;
  const cappedPassiveIncomeCompletion = Math.min(passiveIncomeCompletion, 1);
  const journeySpeed = calculateRequiredJourneySpeed({
    missingWealth: wealthJourney.missingWealth,
    termMonths: wealthEvolution.wealth.termMonths,
  });

  return (
    <section className="grid gap-6">
      <section className="rounded-md border bg-card p-6 text-card-foreground sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Dashboard executivo
            </p>
            <h1 className="mt-3 text-3xl font-semibold text-foreground">
              EVOLV Intelligence
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
              Planejamento patrimonial e simulacoes estrategicas.
            </p>
          </div>
          <button
            className="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-md border border-primary bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
            onClick={onCreateSimulation}
            type="button"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Criar simulacao
          </button>
        </div>
      </section>

      <section className="rounded-md border bg-card p-6 text-card-foreground sm:p-8">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Patrimonio projetado
            </p>
            <div className="mt-4 flex flex-wrap items-end gap-x-6 gap-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Patrimonio atual</p>
                <p className="mt-1 text-4xl font-semibold text-foreground">
                  {currencyFormatter.format(wealthJourney.currentWealth)}
                </p>
              </div>
              <div className="pb-1">
                <p className="text-sm text-muted-foreground">Meta patrimonial</p>
                <p className="mt-1 text-2xl font-semibold text-primary">
                  {currencyFormatter.format(wealthJourney.targetWealth)}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[360px]">
            <HeroMetric
              label="Patrimonio faltante"
              value={currencyFormatter.format(wealthJourney.missingWealth)}
            />
            <HeroMetric
              label="Prazo da meta"
              value={`${wealthEvolution.wealth.termMonths} meses`}
            />
          </div>
        </div>

        <div className="mt-7">
          <div className="mb-3 flex items-center justify-between gap-4 text-sm">
            <span className="font-medium text-foreground">
              {percentFormatter.format(wealthJourney.completionRate)} concluido
            </span>
            <span className="text-muted-foreground">
              {percentFormatter.format(wealthJourney.remainingRate)} restante
            </span>
          </div>
          <div className="h-4 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${cappedWealthCompletion * 100}%` }}
            />
          </div>
        </div>
      </section>

      <WealthMilestoneTimeline
        compact
        currentWealth={wealthJourney.currentWealth}
      />

      <section className="grid gap-4 xl:grid-cols-3">
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

      <section className="rounded-md border bg-card p-5 text-card-foreground sm:p-6">
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

function calculateRequiredJourneySpeed({
  missingWealth,
  termMonths,
}: {
  missingWealth: number;
  termMonths: number;
}) {
  if (missingWealth <= 0 || termMonths <= 0) {
    return 0;
  }

  return missingWealth / termMonths;
}

function HeroMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-background p-4">
      <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-xl font-semibold text-foreground">{value}</p>
    </div>
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
    <article className="rounded-md border bg-card p-5 text-card-foreground sm:p-6">
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
