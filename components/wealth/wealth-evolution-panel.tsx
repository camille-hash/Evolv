"use client";

import { useEffect, useMemo, useState } from "react";
import {
  buildWealthJourney,
  buildWealthEvolution,
  loadWealthEvolutionInput,
  saveWealthEvolutionInput,
  type WealthEvolutionInput,
  type WealthGoalProgress,
  type WealthJourney,
} from "@/modules/wealth";

type WealthEvolutionFormState = {
  currentWealth: string;
  targetWealth: string;
  wealthGoalTermMonths: string;
  currentPassiveIncome: string;
  targetPassiveIncome: string;
  passiveIncomeGoalTermMonths: string;
  averagePropertyValue: string;
  averageLetterValue: string;
};

const initialFormState: WealthEvolutionFormState = {
  currentWealth: "",
  targetWealth: "",
  wealthGoalTermMonths: "120",
  currentPassiveIncome: "",
  targetPassiveIncome: "",
  passiveIncomeGoalTermMonths: "120",
  averagePropertyValue: "",
  averageLetterValue: "",
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const percentFormatter = new Intl.NumberFormat("pt-BR", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export function WealthEvolutionPanel() {
  const [formState, setFormState] =
    useState<WealthEvolutionFormState>(initialFormState);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const savedInput = loadWealthEvolutionInput();

      setFormState(toFormState(savedInput));
      setIsLoaded(true);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const wealthInput = useMemo(() => toWealthInput(formState), [formState]);
  const evolution = useMemo(
    () => buildWealthEvolution(wealthInput),
    [wealthInput],
  );
  const journey = useMemo(
    () => buildWealthJourney({ evolution, input: wealthInput }),
    [evolution, wealthInput],
  );

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    saveWealthEvolutionInput(wealthInput);
  }, [isLoaded, wealthInput]);

  return (
    <section className="rounded-md border bg-card p-6 text-card-foreground sm:p-7">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Wealth
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-foreground">
            Evolucao Patrimonial
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Registro simples das metas patrimoniais e de renda passiva para
            acompanhar a evolucao do cliente.
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          Salvo automaticamente neste navegador.
        </p>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <WealthGoalCard
          currentInput={
            <WealthInputField
              label="Patrimonio atual"
              value={formState.currentWealth}
              onChange={(currentWealth) => updateFormState({ currentWealth })}
            />
          }
          goal={evolution.wealth}
          targetInput={
            <WealthInputField
              label="Meta patrimonial"
              value={formState.targetWealth}
              onChange={(targetWealth) => updateFormState({ targetWealth })}
            />
          }
          termInput={
            <WealthInputField
              inputMode="numeric"
              label="Prazo da meta"
              suffix="meses"
              value={formState.wealthGoalTermMonths}
              onChange={(wealthGoalTermMonths) =>
                updateFormState({ wealthGoalTermMonths })
              }
            />
          }
          title="Patrimonio"
        />

        <WealthGoalCard
          currentInput={
            <WealthInputField
              label="Renda passiva atual"
              value={formState.currentPassiveIncome}
              onChange={(currentPassiveIncome) =>
                updateFormState({ currentPassiveIncome })
              }
            />
          }
          goal={evolution.passiveIncome}
          targetInput={
            <WealthInputField
              label="Meta de renda passiva"
              value={formState.targetPassiveIncome}
              onChange={(targetPassiveIncome) =>
                updateFormState({ targetPassiveIncome })
              }
            />
          }
          termInput={
            <WealthInputField
              inputMode="numeric"
              label="Prazo da meta"
              suffix="meses"
              value={formState.passiveIncomeGoalTermMonths}
              onChange={(passiveIncomeGoalTermMonths) =>
                updateFormState({ passiveIncomeGoalTermMonths })
              }
            />
          }
          title="Renda Passiva"
        />
      </div>

      <WealthJourneySection
        journey={journey}
        averageLetterInput={
          <WealthInputField
            label="Valor medio da carta"
            value={formState.averageLetterValue}
            onChange={(averageLetterValue) =>
              updateFormState({ averageLetterValue })
            }
          />
        }
        averagePropertyInput={
          <WealthInputField
            label="Valor medio do imovel"
            value={formState.averagePropertyValue}
            onChange={(averagePropertyValue) =>
              updateFormState({ averagePropertyValue })
            }
          />
        }
      />
    </section>
  );

  function updateFormState(partialState: Partial<WealthEvolutionFormState>) {
    setFormState((current) => ({ ...current, ...partialState }));
  }
}

function WealthJourneySection({
  averageLetterInput,
  averagePropertyInput,
  journey,
}: {
  averageLetterInput: React.ReactNode;
  averagePropertyInput: React.ReactNode;
  journey: WealthJourney;
}) {
  const cappedCompletionRate = Math.min(journey.completionRate, 1);

  return (
    <section className="mt-6 rounded-md border bg-background p-5">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            Jornada Patrimonial
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Onde o cliente esta, quanto falta e quais sao os proximos marcos.
          </p>
        </div>
        <div className="text-sm font-medium text-muted-foreground">
          {percentFormatter.format(journey.completionRate)} concluido ·{" "}
          {percentFormatter.format(journey.remainingRate)} restante
        </div>
      </div>

      <div className="mt-5 h-4 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${cappedCompletionRate * 100}%` }}
        />
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <WealthValue label="Patrimonio atual" value={journey.currentWealth} />
        <WealthValue label="Patrimonio faltante" value={journey.missingWealth} />
        <WealthValue
          label="Proximo marco"
          value={journey.nextWealthMilestone?.value ?? journey.currentWealth}
        />
        <WealthValue
          label="Falta para o marco"
          value={journey.nextWealthMilestone?.missingValue ?? 0}
        />
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {averagePropertyInput}
        {averageLetterInput}
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <JourneyStatement>
          Necessarios aproximadamente {journey.requiredProperties} imoveis para
          atingir a meta.
        </JourneyStatement>
        <JourneyStatement>
          Necessarias aproximadamente {journey.requiredLetters} cartas para
          atingir a meta.
        </JourneyStatement>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <WealthValue label="Renda atual" value={journey.currentPassiveIncome} />
        <WealthValue label="Renda faltante" value={journey.missingPassiveIncome} />
        <WealthValue
          label="Proximo marco de renda"
          value={
            journey.nextPassiveIncomeMilestone?.value ??
            journey.currentPassiveIncome
          }
        />
      </div>
    </section>
  );
}

function JourneyStatement({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border bg-card p-4 text-sm font-medium leading-6 text-foreground">
      {children}
    </div>
  );
}

function WealthGoalCard({
  currentInput,
  goal,
  targetInput,
  termInput,
  title,
}: {
  currentInput: React.ReactNode;
  goal: WealthGoalProgress;
  targetInput: React.ReactNode;
  termInput: React.ReactNode;
  title: string;
}) {
  const cappedCompletionRate = Math.min(goal.completionRate, 1);

  return (
    <article className="rounded-md border bg-background p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {goal.termMonths} meses para a meta
          </p>
        </div>
        <div className="rounded-md border bg-card px-3 py-2 text-right">
          <p className="text-xs text-muted-foreground">Concluido</p>
          <p className="mt-1 text-lg font-semibold text-primary">
            {percentFormatter.format(goal.completionRate)}
          </p>
        </div>
      </div>

      <div className="mt-5 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${cappedCompletionRate * 100}%` }}
        />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <WealthValue label="Atual" value={goal.currentValue} />
        <WealthValue label="Meta" value={goal.targetValue} />
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {currentInput}
        {targetInput}
        {termInput}
      </div>
    </article>
  );
}

function WealthValue({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border bg-card p-4">
      <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-xl font-semibold text-foreground">
        {currencyFormatter.format(value)}
      </p>
    </div>
  );
}

function WealthInputField({
  inputMode = "decimal",
  label,
  onChange,
  suffix,
  value,
}: {
  inputMode?: "decimal" | "numeric";
  label: string;
  onChange: (value: string) => void;
  suffix?: string;
  value: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      {label}
      <div className="flex h-10 items-center rounded-md border bg-card focus-within:ring-2 focus-within:ring-ring">
        <input
          className="min-w-0 flex-1 bg-transparent px-3 text-sm outline-none"
          inputMode={inputMode}
          onChange={(event) => onChange(event.target.value)}
          value={value}
        />
        {suffix ? (
          <span className="pr-3 text-xs text-muted-foreground">{suffix}</span>
        ) : null}
      </div>
    </label>
  );
}

function toWealthInput(
  formState: WealthEvolutionFormState,
): WealthEvolutionInput {
  return {
    currentWealth: parsePositiveNumber(formState.currentWealth),
    targetWealth: parsePositiveNumber(formState.targetWealth),
    wealthGoalTermMonths: parsePositiveInteger(
      formState.wealthGoalTermMonths,
    ),
    currentPassiveIncome: parsePositiveNumber(
      formState.currentPassiveIncome,
    ),
    targetPassiveIncome: parsePositiveNumber(formState.targetPassiveIncome),
    passiveIncomeGoalTermMonths: parsePositiveInteger(
      formState.passiveIncomeGoalTermMonths,
    ),
    averagePropertyValue: parsePositiveNumber(formState.averagePropertyValue),
    averageLetterValue: parsePositiveNumber(formState.averageLetterValue),
  };
}

function toFormState(input: WealthEvolutionInput): WealthEvolutionFormState {
  return {
    currentWealth: input.currentWealth ? String(input.currentWealth) : "",
    targetWealth: input.targetWealth ? String(input.targetWealth) : "",
    wealthGoalTermMonths: String(input.wealthGoalTermMonths),
    currentPassiveIncome: input.currentPassiveIncome
      ? String(input.currentPassiveIncome)
      : "",
    targetPassiveIncome: input.targetPassiveIncome
      ? String(input.targetPassiveIncome)
      : "",
    passiveIncomeGoalTermMonths: String(input.passiveIncomeGoalTermMonths),
    averagePropertyValue: input.averagePropertyValue
      ? String(input.averagePropertyValue)
      : "",
    averageLetterValue: input.averageLetterValue
      ? String(input.averageLetterValue)
      : "",
  };
}

function parsePositiveNumber(value: string) {
  const normalized = Number(value.replace(",", "."));

  return Number.isFinite(normalized) && normalized > 0 ? normalized : 0;
}

function parsePositiveInteger(value: string) {
  return Math.max(1, Math.trunc(parsePositiveNumber(value)));
}
