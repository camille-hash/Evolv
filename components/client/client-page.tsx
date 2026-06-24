"use client";

import { useEffect, useMemo, useState } from "react";
import {
  emptyClientContext,
  loadClientContext,
  loadCurrentClientRecord,
  saveClientContext,
  type ClientCommercialArtifactSummary,
  type ClientContext,
  type ClientRecord,
} from "@/modules/client-context";
import { generateEvolvMasterReport } from "@/modules/reports";

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
  const [currentClientRecord, setCurrentClientRecord] = useState<ClientRecord | null>(
    null,
  );
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const savedContext = loadClientContext();
      const savedClientRecord = loadCurrentClientRecord();

      setFormState(toFormState(savedContext));
      setCurrentClientRecord(savedClientRecord);
      onClientContextChange(savedContext);
      setIsLoaded(true);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [onClientContextChange]);

  const clientContext = useMemo(() => toClientContext(formState), [formState]);
  const clientRecordView = useMemo(
    () =>
      currentClientRecord
        ? {
            ...currentClientRecord,
            context: clientContext,
          }
        : null,
    [clientContext, currentClientRecord],
  );

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
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
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
          <div className="flex flex-col items-start gap-3 sm:items-end">
            <p className="text-sm text-muted-foreground">
              Salvo automaticamente neste navegador.
            </p>
            <button
              className="inline-flex h-10 items-center justify-center rounded-md border border-primary bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
              onClick={() => generateEvolvMasterReport(clientContext)}
              type="button"
            >
              Gerar Dossie EVOLV
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          {clientRecordView ? (
            <div className="rounded-md border bg-background/70 p-5 xl:col-span-2">
              <h3 className="text-base font-semibold text-foreground">
                Conversao CRM {"->"} Cliente
              </h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Evento oficial de conversao que preserva o historico de aquisicao no
                CRM e inicia a jornada patrimonial no modulo Cliente.
              </p>
              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <ClientSummaryItem
                  label="Lead de origem"
                  value={clientRecordView.context.nome || "Nao informado"}
                />
                <ClientSummaryItem
                  label="Convertido em"
                  value={dateTimeFormatter.format(
                    new Date(clientRecordView.convertedAt),
                  )}
                />
                <ClientSummaryItem
                  label="Responsavel"
                  value={clientRecordView.convertedByName}
                />
                <ClientSummaryItem
                  label="Perfil herdado"
                  value={clientRecordView.context.perfil || "Nao informado"}
                />
              </div>
            </div>
          ) : null}

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

        {clientRecordView ? (
          <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_1fr]">
            <div className="rounded-md border bg-background/70 p-5">
              <h3 className="text-base font-semibold text-foreground">
                Perfil Estrategico Herdado
              </h3>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <ClientSummaryItem
                  label="Objetivo Principal"
                  value={clientRecordView.strategicProfile.primaryGoal || "Nao informado"}
                />
                <ClientSummaryItem
                  label="Momento Atual"
                  value={clientRecordView.strategicProfile.currentMoment || "Nao informado"}
                />
                <ClientSummaryItem
                  label="Temas Relevantes"
                  value={
                    clientRecordView.strategicProfile.strategicTopics.length
                      ? clientRecordView.strategicProfile.strategicTopics.join(", ")
                      : "Nenhum tema registrado"
                  }
                />
                <ClientSummaryItem
                  label="Observacoes Estrategicas"
                  value={
                    clientRecordView.strategicProfile.strategicNotes ||
                    "Nenhuma observacao estrategica"
                  }
                />
              </div>
            </div>

            <div className="rounded-md border bg-background/70 p-5">
              <h3 className="text-base font-semibold text-foreground">
                Contexto Comercial Herdado
              </h3>
              <div className="mt-5 grid gap-3">
                <ClientCommercialArtifactCard
                  artifact={clientRecordView.latestCommercialSimulation}
                  emptyText="Nenhuma simulacao comercial herdada."
                  title="Ultima Simulacao"
                />
                <ClientCommercialArtifactCard
                  artifact={clientRecordView.latestMultiCotasStudy}
                  emptyText="Nenhum estudo Multi-Cotas herdado."
                  title="Ultimo Estudo Multi-Cotas"
                />
              </div>
            </div>
          </div>
        ) : null}
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

const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

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

function ClientSummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-card p-3">
      <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm leading-6 text-foreground">{value}</p>
    </div>
  );
}

function ClientCommercialArtifactCard({
  artifact,
  emptyText,
  title,
}: {
  artifact: ClientCommercialArtifactSummary | null;
  emptyText: string;
  title: string;
}) {
  return (
    <div className="rounded-md border bg-card p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {title}
      </p>
      {artifact ? (
        <div className="mt-3 grid gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-medium text-foreground">{artifact.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {artifact.simulationType === "multi_cotas"
                  ? "Multi-Cotas"
                  : "Simulacao Comercial"}
              </p>
            </div>
            <span className="text-xs text-muted-foreground">
              {dateTimeFormatter.format(new Date(artifact.createdAt))}
            </span>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <ClientSummaryItem
              label="Credito"
              value={
                artifact.commercialCredit
                  ? currencyFormatter.format(artifact.commercialCredit)
                  : "-"
              }
            />
            <ClientSummaryItem
              label="Parcela"
              value={
                artifact.monthlyPayment
                  ? currencyFormatter.format(artifact.monthlyPayment)
                  : "-"
              }
            />
          </div>
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">{emptyText}</p>
      )}
    </div>
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
