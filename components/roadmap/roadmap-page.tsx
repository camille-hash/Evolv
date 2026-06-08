"use client";

import { useEffect, useMemo, useState } from "react";
import {
  emptyClientContext,
  loadClientContext,
  type ClientContext,
} from "@/modules/client-context";
import { loadOperations, type Operation } from "@/modules/operations";
import {
  buildStrategicRoadmap,
  type RoadmapStep,
} from "@/modules/roadmap";
import { listStrategies, type Strategy } from "@/modules/strategies";
import {
  loadWealthEvolutionInput,
  type WealthEvolutionInput,
} from "@/modules/wealth";
import { cn } from "@/lib/utils";

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

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  currency: "BRL",
  style: "currency",
});

export function RoadmapPage() {
  const [clientContext, setClientContext] =
    useState<ClientContext>(emptyClientContext);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [wealthInput, setWealthInput] =
    useState<WealthEvolutionInput>(emptyWealthInput);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setClientContext(loadClientContext());
      setOperations(loadOperations());
      setStrategies(listStrategies());
      setWealthInput(loadWealthEvolutionInput());
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const activeStrategy = strategies[0] ?? null;
  const roadmap = useMemo(
    () =>
      buildStrategicRoadmap({
        clientContext,
        operations,
        activeStrategy,
        wealthInput,
      }),
    [activeStrategy, clientContext, operations, wealthInput],
  );

  return (
    <section className="grid gap-6">
      <section className="executive-hero rounded-md p-6 text-primary-foreground sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary-foreground/70">
          Plano Patrimonial
        </p>
        <h2 className="mt-4 text-4xl font-semibold tracking-normal">
          Cliente, operacoes e meta em uma unica jornada.
        </h2>
        <p className="mt-4 max-w-3xl text-base leading-7 text-primary-foreground/78">
          Visualizacao estrategica para conectar a situacao atual do cliente ao
          portfolio de operacoes e ao destino patrimonial desejado.
        </p>

        <div className="mt-7 grid gap-3 md:grid-cols-3">
          <RoadmapHeroMetric
            label="Cliente"
            value={clientContext.nome || "Nao informado"}
          />
          <RoadmapHeroMetric
            label="Estrategia ativa"
            value={roadmap.activeStrategyName}
          />
          <RoadmapHeroMetric
            label="Etapas"
            value={String(roadmap.steps.length)}
          />
        </div>
      </section>

      <section className="executive-surface rounded-md p-5 text-card-foreground sm:p-6">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Linha do tempo
          </p>
          <h3 className="text-xl font-semibold text-foreground">
            Jornada estrategica
          </h3>
        </div>

        <div className="mt-6 grid gap-4">
          {roadmap.steps.map((step, index) => (
            <RoadmapStepCard
              isLast={index === roadmap.steps.length - 1}
              key={step.id}
              step={step}
            />
          ))}
        </div>
      </section>

      <section className="executive-surface rounded-md p-5 text-card-foreground sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Destino final
        </p>
        <h3 className="mt-2 text-xl font-semibold text-foreground">
          Meta Patrimonial
        </h3>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <RoadmapDetail
            label="Meta Patrimonial"
            value={currencyFormatter.format(roadmap.finalGoal.metaPatrimonial)}
          />
          <RoadmapDetail
            label="Meta de Renda"
            value={currencyFormatter.format(roadmap.finalGoal.metaRenda)}
          />
          <RoadmapDetail
            label="Prazo"
            value={`${roadmap.finalGoal.prazo} meses`}
          />
        </div>
      </section>
    </section>
  );
}

function RoadmapStepCard({
  isLast,
  step,
}: {
  isLast: boolean;
  step: RoadmapStep;
}) {
  return (
    <article className="grid gap-4 md:grid-cols-[42px_1fr]">
      <div className="hidden justify-items-center md:grid">
        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-full border text-xs font-semibold",
            step.status === "completed" && "border-primary bg-primary text-primary-foreground",
            step.status === "active" && "border-brand-gold bg-brand-gold/[0.18] text-brand-ink",
            step.status === "planned" && "border-border bg-background text-muted-foreground",
          )}
        >
          {step.kind === "today" ? "H" : step.kind === "goal" ? "M" : "O"}
        </div>
        {!isLast ? <div className="h-full min-h-8 w-px bg-border" /> : null}
      </div>

      <div className="rounded-md border bg-background/70 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
              {getStatusLabel(step.status)}
            </p>
            <h4 className="mt-2 text-lg font-semibold text-foreground">
              {step.nome}
            </h4>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {step.objetivo}
            </p>
          </div>
          {step.credito > 0 ? (
            <div className="rounded-md border bg-card px-3 py-2 text-sm font-semibold text-foreground">
              {currencyFormatter.format(step.credito)}
            </div>
          ) : null}
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <RoadmapDetail
            label="Administradora"
            value={step.administradora || "Nao aplicavel"}
          />
          <RoadmapDetail label="Tipo" value={getKindLabel(step.kind)} />
        </div>
      </div>
    </article>
  );
}

function RoadmapHeroMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-primary-foreground/14 bg-primary-foreground/8 p-4">
      <p className="text-xs font-medium uppercase tracking-[0.08em] text-primary-foreground/62">
        {label}
      </p>
      <p className="mt-2 text-lg font-semibold text-primary-foreground">
        {value}
      </p>
    </div>
  );
}

function RoadmapDetail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium text-foreground">{value}</p>
    </div>
  );
}

function getStatusLabel(status: RoadmapStep["status"]) {
  const labels: Record<RoadmapStep["status"], string> = {
    completed: "Concluida",
    active: "Ativa",
    planned: "Planejada",
  };

  return labels[status];
}

function getKindLabel(kind: RoadmapStep["kind"]) {
  const labels: Record<RoadmapStep["kind"], string> = {
    today: "Ponto de partida",
    operation: "Operacao patrimonial",
    goal: "Meta final",
  };

  return labels[kind];
}

