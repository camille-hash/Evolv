"use client";

import { useEffect, useState } from "react";
import { Copy, Pencil, Plus, Trash2 } from "lucide-react";
import {
  createEmptyStrategyDraft,
  createStrategyDraftFromTemplate,
  deleteStrategy,
  duplicateStoredStrategy,
  listStrategies,
  saveStrategy,
  strategyTemplates,
  strategyTypeLabels,
  type Strategy,
  type StrategyDraft,
  type StrategyType,
} from "@/modules/strategies";
import { cn } from "@/lib/utils";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

type StrategyFormState = {
  name: string;
  type: StrategyType;
  objective: string;
  description: string;
  targetWealth: string;
  targetIncome: string;
  termMonths: string;
  notes: string;
};

export function StrategiesPage() {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [activeStrategyId, setActiveStrategyId] = useState<string | null>(null);
  const [formState, setFormState] = useState<StrategyFormState>(() =>
    toFormState(createEmptyStrategyDraft()),
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setStrategies(listStrategies());
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  return (
    <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
      <section className="rounded-md border bg-card p-5 text-card-foreground sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-base font-semibold">Estrategias cadastradas</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Planos patrimoniais salvos neste navegador.
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            {strategies.length} registros
          </p>
        </div>

        {strategies.length > 0 ? (
          <div className="mt-5 grid gap-3">
            {strategies.map((strategy) => (
              <StrategyCard
                isActive={activeStrategyId === strategy.id}
                key={strategy.id}
                strategy={strategy}
                onDelete={() => handleDeleteStrategy(strategy.id)}
                onDuplicate={() => handleDuplicateStrategy(strategy.id)}
                onEdit={() => handleEditStrategy(strategy)}
              />
            ))}
          </div>
        ) : (
          <div className="mt-5 rounded-md border border-dashed bg-background p-5 text-sm text-muted-foreground">
            Nenhuma estrategia cadastrada.
          </div>
        )}
      </section>

      <section className="rounded-md border bg-card p-5 text-card-foreground sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold">
              {activeStrategyId ? "Editar estrategia" : "Criar estrategia"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Defina o plano patrimonial de referencia.
            </p>
          </div>
          <button
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border bg-background transition hover:border-primary/40 hover:bg-accent"
            onClick={handleNewStrategy}
            title="Nova estrategia"
            type="button"
          >
            <Plus className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div className="mt-5 grid gap-4">
          <label className="grid gap-2 text-sm font-medium">
            Tipo
            <select
              className="h-10 rounded-md border bg-background px-3 text-sm outline-none transition focus:ring-2 focus:ring-ring"
              onChange={(event) =>
                handleSelectTemplate(event.target.value as StrategyType)
              }
              value={formState.type}
            >
              {strategyTemplates.map((template) => (
                <option key={template.type} value={template.type}>
                  {strategyTypeLabels[template.type]}
                </option>
              ))}
            </select>
          </label>
          <StrategyInput
            label="Nome"
            value={formState.name}
            onChange={(name) => updateFormState({ name })}
          />
          <StrategyInput
            label="Objetivo"
            value={formState.objective}
            onChange={(objective) => updateFormState({ objective })}
          />
          <StrategyTextArea
            label="Descricao"
            value={formState.description}
            onChange={(description) => updateFormState({ description })}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <StrategyInput
              inputMode="decimal"
              label="Meta patrimonial"
              value={formState.targetWealth}
              onChange={(targetWealth) => updateFormState({ targetWealth })}
            />
            <StrategyInput
              inputMode="decimal"
              label="Meta de renda"
              value={formState.targetIncome}
              onChange={(targetIncome) => updateFormState({ targetIncome })}
            />
          </div>
          <StrategyInput
            inputMode="numeric"
            label="Prazo"
            suffix="meses"
            value={formState.termMonths}
            onChange={(termMonths) => updateFormState({ termMonths })}
          />
          <StrategyTextArea
            label="Observacoes"
            value={formState.notes}
            onChange={(notes) => updateFormState({ notes })}
          />
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-primary bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
            onClick={handleSaveStrategy}
            type="button"
          >
            Salvar estrategia
          </button>
        </div>
      </section>
    </section>
  );

  function updateFormState(partialState: Partial<StrategyFormState>) {
    setFormState((current) => ({ ...current, ...partialState }));
  }

  function handleSelectTemplate(type: StrategyType) {
    const draft = createStrategyDraftFromTemplate(type);

    setFormState((current) => ({
      ...current,
      type,
      objective: draft.objective,
      description: draft.description,
      name: current.name.trim() ? current.name : draft.name,
    }));
  }

  function handleSaveStrategy() {
    const savedStrategy = saveStrategy({
      id: activeStrategyId,
      draft: toStrategyDraft(formState),
    });

    setActiveStrategyId(savedStrategy.id);
    setFormState(toFormState(savedStrategy));
    setStrategies(listStrategies());
  }

  function handleEditStrategy(strategy: Strategy) {
    setActiveStrategyId(strategy.id);
    setFormState(toFormState(strategy));
  }

  function handleNewStrategy() {
    setActiveStrategyId(null);
    setFormState(toFormState(createEmptyStrategyDraft()));
  }

  function handleDeleteStrategy(id: string) {
    const nextStrategies = deleteStrategy(id);

    setStrategies(nextStrategies);

    if (activeStrategyId === id) {
      handleNewStrategy();
    }
  }

  function handleDuplicateStrategy(id: string) {
    const duplicatedStrategy = duplicateStoredStrategy(id);

    if (!duplicatedStrategy) {
      return;
    }

    setStrategies(listStrategies());
    setActiveStrategyId(duplicatedStrategy.id);
    setFormState(toFormState(duplicatedStrategy));
  }
}

function StrategyCard({
  isActive,
  onDelete,
  onDuplicate,
  onEdit,
  strategy,
}: {
  isActive: boolean;
  onDelete: () => void;
  onDuplicate: () => void;
  onEdit: () => void;
  strategy: Strategy;
}) {
  const metaValue = strategy.targetWealth || strategy.targetIncome;

  return (
    <article
      className={cn(
        "grid gap-4 rounded-md border bg-background p-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center",
        isActive && "border-primary/50 bg-primary/[0.03]",
      )}
    >
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
          {strategyTypeLabels[strategy.type]}
        </p>
        <h3 className="mt-2 truncate text-base font-semibold text-foreground">
          {strategy.name}
        </h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {strategy.objective}
        </p>
        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-3">
          <StrategyDetail
            label="Meta"
            value={metaValue ? currencyFormatter.format(metaValue) : "Nao definida"}
          />
          <StrategyDetail label="Prazo" value={`${strategy.termMonths} meses`} />
          <StrategyDetail label="Tipo" value={strategyTypeLabels[strategy.type]} />
        </div>
      </div>
      <div className="flex items-center gap-2 lg:justify-end">
        <StrategyAction label="Editar" onClick={onEdit}>
          <Pencil className="h-4 w-4" aria-hidden />
        </StrategyAction>
        <StrategyAction label="Duplicar" onClick={onDuplicate}>
          <Copy className="h-4 w-4" aria-hidden />
        </StrategyAction>
        <StrategyAction label="Excluir" onClick={onDelete}>
          <Trash2 className="h-4 w-4" aria-hidden />
        </StrategyAction>
      </div>
    </article>
  );
}

function StrategyDetail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium text-foreground">{value}</p>
    </div>
  );
}

function StrategyAction({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      className="flex h-9 w-9 items-center justify-center rounded-md border bg-card transition hover:border-primary/40 hover:bg-accent"
      onClick={onClick}
      title={label}
      type="button"
    >
      {children}
    </button>
  );
}

function StrategyInput({
  inputMode = "text",
  label,
  onChange,
  suffix,
  value,
}: {
  inputMode?: "decimal" | "numeric" | "text";
  label: string;
  onChange: (value: string) => void;
  suffix?: string;
  value: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      {label}
      <div className="flex h-10 items-center rounded-md border bg-background focus-within:ring-2 focus-within:ring-ring">
        <input
          className="min-w-0 flex-1 bg-transparent px-3 text-sm outline-none"
          inputMode={inputMode === "text" ? undefined : inputMode}
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

function StrategyTextArea({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      {label}
      <textarea
        className="min-h-24 resize-y rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-ring"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </label>
  );
}

function toStrategyDraft(formState: StrategyFormState): StrategyDraft {
  return {
    name: formState.name,
    type: formState.type,
    objective: formState.objective,
    description: formState.description,
    targetWealth: parsePositiveNumber(formState.targetWealth),
    targetIncome: parsePositiveNumber(formState.targetIncome),
    termMonths: parsePositiveInteger(formState.termMonths),
    notes: formState.notes,
  };
}

function toFormState(strategy: StrategyDraft): StrategyFormState {
  return {
    name: strategy.name,
    type: strategy.type,
    objective: strategy.objective,
    description: strategy.description,
    targetWealth: strategy.targetWealth ? String(strategy.targetWealth) : "",
    targetIncome: strategy.targetIncome ? String(strategy.targetIncome) : "",
    termMonths: String(strategy.termMonths),
    notes: strategy.notes,
  };
}

function parsePositiveNumber(value: string) {
  const normalized = Number(value.replace(",", "."));

  return Number.isFinite(normalized) && normalized > 0 ? normalized : 0;
}

function parsePositiveInteger(value: string) {
  const normalized = Math.trunc(parsePositiveNumber(value));

  return normalized > 0 ? normalized : 120;
}
