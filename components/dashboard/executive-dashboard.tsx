"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Plus } from "lucide-react";
import {
  buildWealthEvolution,
  buildWealthJourney,
  loadWealthEvolutionInput,
  type WealthEvolutionInput,
} from "@/modules/wealth";
import {
  formatSimulationDate,
  loadSavedSimulations,
  type SimulatorSavedSimulation,
} from "@/modules/simulator";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
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

  return (
    <section className="grid gap-6">
      <section className="rounded-md border bg-card p-6 text-card-foreground sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Dashboard
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

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DashboardMetric
          label="Patrimonio atual"
          value={currencyFormatter.format(wealthEvolution.wealth.currentValue)}
        />
        <DashboardMetric
          label="Meta patrimonial"
          value={currencyFormatter.format(wealthEvolution.wealth.targetValue)}
        />
        <DashboardMetric
          label="Renda passiva atual"
          value={currencyFormatter.format(
            wealthEvolution.passiveIncome.currentValue,
          )}
        />
        <DashboardMetric
          label="Meta de renda passiva"
          value={currencyFormatter.format(
            wealthEvolution.passiveIncome.targetValue,
          )}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-md border bg-card p-5 text-card-foreground sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold">Ultima simulacao</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Historico operacional deste navegador.
              </p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden />
          </div>

          {latestSimulation ? (
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <DashboardDetail label="Nome" value={latestSimulation.name} />
              <DashboardDetail
                label="Atualizada em"
                value={formatSimulationDate(latestSimulation.updatedAt)}
              />
              <DashboardDetail
                label="Credito"
                value={currencyFormatter.format(
                  latestSimulation.results.contractedCredit,
                )}
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
              Nenhuma simulacao salva ainda.
            </div>
          )}
        </article>

        <article className="rounded-md border bg-card p-5 text-card-foreground sm:p-6">
          <h2 className="text-base font-semibold">Proximo marco patrimonial</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Referencia de evolucao para a jornada.
          </p>
          <div className="mt-5 rounded-md border bg-primary/[0.03] p-5">
            <p className="text-sm text-muted-foreground">Marco</p>
            <p className="mt-2 text-3xl font-semibold text-primary">
              {wealthJourney.nextWealthMilestone
                ? currencyFormatter.format(wealthJourney.nextWealthMilestone.value)
                : "Meta atingida"}
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              {wealthJourney.nextWealthMilestone
                ? `${currencyFormatter.format(
                    wealthJourney.nextWealthMilestone.missingValue,
                  )} para o proximo marco.`
                : "Nao ha marco pendente acima do patrimonio atual."}
            </p>
          </div>
        </article>
      </section>
    </section>
  );
}

function DashboardMetric({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-md border bg-card p-5 text-card-foreground">
      <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-3 text-2xl font-semibold text-foreground">{value}</p>
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
