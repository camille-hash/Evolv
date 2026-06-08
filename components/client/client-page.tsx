"use client";

import { useEffect, useMemo, useState } from "react";
import {
  emptyClientContext,
  loadClientContext,
  saveClientContext,
  type ClientContext,
} from "@/modules/client-context";

type ClientFormState = {
  nome: string;
  telefone: string;
  email: string;
  perfil: string;
  patrimonioAtual: string;
  metaPatrimonial: string;
  rendaAtual: string;
  metaRenda: string;
  prazoMeta: string;
  observacoes: string;
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  currency: "BRL",
  style: "currency",
});

export function ClientPage({
  onClientContextChange,
}: {
  onClientContextChange: (context: ClientContext) => void;
}) {
  const [formState, setFormState] = useState<ClientFormState>(
    toFormState(emptyClientContext),
  );
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const savedContext = loadClientContext();

      setFormState(toFormState(savedContext));
      onClientContextChange(savedContext);
      setIsLoaded(true);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [onClientContextChange]);

  const clientContext = useMemo(() => toClientContext(formState), [formState]);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    saveClientContext(clientContext);
    onClientContextChange(clientContext);
  }, [clientContext, isLoaded, onClientContextChange]);

  return (
    <section className="grid gap-6">
      <section className="executive-surface rounded-md p-6 text-card-foreground sm:p-7">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Cliente atual
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-foreground">
              Contexto patrimonial
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Dados comerciais e patrimoniais usados para orientar a leitura do
              Dashboard executivo.
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            Salvo automaticamente neste navegador.
          </p>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-md border bg-background/70 p-5">
            <h3 className="text-base font-semibold text-foreground">
              Identificacao
            </h3>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <ClientInput
                label="Nome"
                onChange={(nome) => updateFormState({ nome })}
                value={formState.nome}
              />
              <ClientInput
                label="Perfil"
                onChange={(perfil) => updateFormState({ perfil })}
                value={formState.perfil}
              />
              <ClientInput
                label="Telefone"
                onChange={(telefone) => updateFormState({ telefone })}
                value={formState.telefone}
              />
              <ClientInput
                label="Email"
                onChange={(email) => updateFormState({ email })}
                value={formState.email}
              />
              <ClientTextarea
                label="Observacoes"
                onChange={(observacoes) => updateFormState({ observacoes })}
                value={formState.observacoes}
              />
            </div>
          </div>

          <div className="rounded-md border bg-background/70 p-5">
            <h3 className="text-base font-semibold text-foreground">
              Metas patrimoniais
            </h3>
            <div className="mt-5 grid gap-3">
              <ClientInput
                inputMode="decimal"
                label="Patrimonio Atual"
                onChange={(patrimonioAtual) =>
                  updateFormState({ patrimonioAtual })
                }
                value={formState.patrimonioAtual}
              />
              <ClientInput
                inputMode="decimal"
                label="Meta Patrimonial"
                onChange={(metaPatrimonial) =>
                  updateFormState({ metaPatrimonial })
                }
                value={formState.metaPatrimonial}
              />
              <ClientInput
                inputMode="decimal"
                label="Renda Atual"
                onChange={(rendaAtual) => updateFormState({ rendaAtual })}
                value={formState.rendaAtual}
              />
              <ClientInput
                inputMode="decimal"
                label="Meta de Renda"
                onChange={(metaRenda) => updateFormState({ metaRenda })}
                value={formState.metaRenda}
              />
              <ClientInput
                inputMode="numeric"
                label="Prazo da Meta"
                onChange={(prazoMeta) => updateFormState({ prazoMeta })}
                suffix="meses"
                value={formState.prazoMeta}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ClientSummaryCard
          label="Patrimonio Atual"
          value={currencyFormatter.format(clientContext.patrimonioAtual)}
        />
        <ClientSummaryCard
          label="Meta Patrimonial"
          value={currencyFormatter.format(clientContext.metaPatrimonial)}
        />
        <ClientSummaryCard
          label="Renda Atual"
          value={currencyFormatter.format(clientContext.rendaAtual)}
        />
        <ClientSummaryCard
          label="Meta de Renda"
          value={currencyFormatter.format(clientContext.metaRenda)}
        />
      </section>
    </section>
  );

  function updateFormState(partialState: Partial<ClientFormState>) {
    setFormState((current) => ({ ...current, ...partialState }));
  }
}

function ClientInput({
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
      <div className="flex h-10 items-center rounded-md border bg-card focus-within:ring-2 focus-within:ring-ring">
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

function ClientTextarea({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium md:col-span-2">
      {label}
      <textarea
        className="min-h-28 rounded-md border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </label>
  );
}

function ClientSummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="executive-surface rounded-md p-5">
      <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-xl font-semibold text-foreground">{value}</p>
    </article>
  );
}

function toClientContext(formState: ClientFormState): ClientContext {
  return {
    nome: formState.nome,
    telefone: formState.telefone,
    email: formState.email,
    perfil: formState.perfil,
    patrimonioAtual: parsePositiveNumber(formState.patrimonioAtual),
    metaPatrimonial: parsePositiveNumber(formState.metaPatrimonial),
    rendaAtual: parsePositiveNumber(formState.rendaAtual),
    metaRenda: parsePositiveNumber(formState.metaRenda),
    prazoMeta: parsePositiveInteger(formState.prazoMeta),
    observacoes: formState.observacoes,
  };
}

function toFormState(context: ClientContext): ClientFormState {
  return {
    nome: context.nome,
    telefone: context.telefone,
    email: context.email,
    perfil: context.perfil,
    patrimonioAtual: context.patrimonioAtual
      ? String(context.patrimonioAtual)
      : "",
    metaPatrimonial: context.metaPatrimonial
      ? String(context.metaPatrimonial)
      : "",
    rendaAtual: context.rendaAtual ? String(context.rendaAtual) : "",
    metaRenda: context.metaRenda ? String(context.metaRenda) : "",
    prazoMeta: String(context.prazoMeta),
    observacoes: context.observacoes,
  };
}

function parsePositiveNumber(value: string) {
  const normalized = Number(value.replace(",", "."));

  return Number.isFinite(normalized) && normalized > 0 ? normalized : 0;
}

function parsePositiveInteger(value: string) {
  return Math.max(1, Math.trunc(parsePositiveNumber(value)));
}

