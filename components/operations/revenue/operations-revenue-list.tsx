"use client";

import { useState } from "react";
import { recognizeOperationsExpectedRevenue } from "@/modules/operations/revenue-client";
import type {
  OperationsRevenueRow,
  OperationsRevenueStatus,
} from "@/modules/operations/revenue-types";
import { OperationsRevenueEmptyState } from "./operations-revenue-empty-state";

type OperationsRevenueListProps = {
  entries: OperationsRevenueRow[];
  onRefresh?: () => Promise<void> | void;
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  currency: "BRL",
  maximumFractionDigits: 0,
  style: "currency",
});

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
});

const statusLabels: Record<OperationsRevenueStatus, string> = {
  attention: "Com problema",
  cancelled: "Cancelada",
  expected: "Prevista",
  pending: "Parcial",
  recognized: "Reconhecida",
};

const statusClasses: Record<OperationsRevenueStatus, string> = {
  attention: "border-amber-200 bg-amber-50 text-amber-800",
  cancelled: "border-rose-200 bg-rose-50 text-rose-800",
  expected: "border-sky-200 bg-sky-50 text-sky-800",
  pending: "border-slate-200 bg-slate-50 text-slate-700",
  recognized: "border-emerald-200 bg-emerald-50 text-emerald-800",
};

export function OperationsRevenueList({
  entries,
  onRefresh,
}: OperationsRevenueListProps) {
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [recognizedAmountInput, setRecognizedAmountInput] = useState("");
  const [recognizedAt, setRecognizedAt] = useState(todayDateInputValue());
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const selectedEntry =
    entries.find((entry) => entry.id === selectedEntryId) ?? null;
  const selectedPendingAmount = selectedEntry
    ? roundCurrency(
        Math.max(selectedEntry.expectedAmount - selectedEntry.recognizedAmount, 0),
      )
    : 0;

  if (!entries.length) {
    return (
      <OperationsRevenueEmptyState
        description="Ajuste a busca ou os filtros para localizar outro recebimento."
        title="Nenhum recebimento encontrado."
      />
    );
  }

  return (
    <>
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="hidden grid-cols-[1.35fr_0.95fr_1fr_0.72fr_0.78fr_0.72fr_0.9fr_auto] gap-3 border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 lg:grid">
          <span>Cliente</span>
          <span>Contrato</span>
          <span>Administradora</span>
          <span>Vencimento</span>
          <span>Competencia</span>
          <span>Valor</span>
          <span>Situacao</span>
          <span className="text-right">Acao</span>
        </div>

        <div className="grid">
          {entries.map((entry) => {
            const pendingAmount = roundCurrency(
              Math.max(entry.expectedAmount - entry.recognizedAmount, 0),
            );
            const canRecognize = pendingAmount > 0 && entry.status !== "cancelled";

            return (
              <article
                className="border-b border-slate-100 px-5 py-4 last:border-b-0"
                key={entry.id}
              >
                <div className="grid gap-4 lg:grid-cols-[1.35fr_0.95fr_1fr_0.72fr_0.78fr_0.72fr_0.9fr_auto] lg:items-center">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-950">
                      {entry.clientName}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {entry.planName
                        ? `Plano ${entry.planName}`
                        : "Plano nao informado"}
                    </p>
                  </div>

                  <ValuePair
                    label="Contrato"
                    value={
                      entry.contractNumber
                        ? `Contrato ${entry.contractNumber}`
                        : "Sem numero"
                    }
                  />

                  <ValuePair
                    label="Administradora"
                    value={entry.administratorName}
                  />

                  <ValuePair
                    label="Vencimento"
                    value={formatDate(entry.dueDate) ?? "Sem data"}
                  />

                  <ValuePair
                    label="Competencia"
                    value={formatCompetency(entry.competency) ?? "Sem competencia"}
                  />

                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500 lg:hidden">
                      Valor
                    </p>
                    <p className="text-sm font-semibold text-slate-950">
                      {currencyFormatter.format(entry.expectedAmount)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Reconhecido {currencyFormatter.format(entry.recognizedAmount)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Saldo {currencyFormatter.format(pendingAmount)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500 lg:hidden">
                      Situacao
                    </p>
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClasses[entry.status]}`}
                    >
                      {statusLabels[entry.status]}
                    </span>
                    <p className="mt-2 text-xs text-slate-500">
                      Recebido em {formatDate(entry.paidAt) ?? "ainda nao"}
                    </p>
                  </div>

                  <div className="flex flex-col items-stretch gap-2 lg:items-end">
                    {canRecognize ? (
                      <button
                        className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-900 transition hover:border-emerald-300 hover:bg-emerald-100"
                        onClick={() => {
                          setSelectedEntryId(entry.id);
                          setRecognizedAmountInput(String(pendingAmount));
                          setRecognizedAt(todayDateInputValue());
                          setNotes("");
                          setSubmitError(null);
                        }}
                        type="button"
                      >
                        Marcar como recebido
                      </button>
                    ) : (
                      <span className="text-xs text-slate-500">
                        Sem acao disponivel
                      </span>
                    )}
                  </div>
                </div>

                {entry.attentionItems.length ? (
                  <div className="mt-3 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                    {entry.attentionItems.join(" | ")}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>

      {selectedEntry ? (
        <RecognizeRevenueModal
          entry={selectedEntry}
          error={submitError}
          isSubmitting={isSubmitting}
          notes={notes}
          pendingAmount={selectedPendingAmount}
          recognizedAmountInput={recognizedAmountInput}
          recognizedAt={recognizedAt}
          onChangeNotes={setNotes}
          onChangeRecognizedAmountInput={setRecognizedAmountInput}
          onChangeRecognizedAt={setRecognizedAt}
          onClose={() => {
            if (isSubmitting) {
              return;
            }

            setSelectedEntryId(null);
            setSubmitError(null);
          }}
          onConfirm={async () => {
            const normalizedAmount = normalizeCurrencyInput(recognizedAmountInput);

            if (!(normalizedAmount > 0)) {
              setSubmitError("Informe um valor valido para reconhecimento.");
              return;
            }

            if (normalizedAmount > selectedPendingAmount) {
              setSubmitError(
                "O valor reconhecido nao pode ser maior que o saldo pendente.",
              );
              return;
            }

            if (!recognizedAt) {
              setSubmitError("Informe a data de recebimento.");
              return;
            }

            setIsSubmitting(true);
            setSubmitError(null);

            try {
              await recognizeOperationsExpectedRevenue(selectedEntry.id, {
                notes: notes.trim() || null,
                recognizedAmount: normalizedAmount,
                recognizedAt,
              });
              await onRefresh?.();
              setSelectedEntryId(null);
            } catch (error) {
              setSubmitError(
                error instanceof Error
                  ? error.message
                  : "Nao foi possivel reconhecer a receita prevista.",
              );
            } finally {
              setIsSubmitting(false);
            }
          }}
        />
      ) : null}
    </>
  );
}

function RecognizeRevenueModal({
  entry,
  error,
  isSubmitting,
  notes,
  pendingAmount,
  recognizedAmountInput,
  recognizedAt,
  onChangeNotes,
  onChangeRecognizedAmountInput,
  onChangeRecognizedAt,
  onClose,
  onConfirm,
}: {
  entry: OperationsRevenueRow;
  error: string | null;
  isSubmitting: boolean;
  notes: string;
  pendingAmount: number;
  recognizedAmountInput: string;
  recognizedAt: string;
  onChangeNotes: (value: string) => void;
  onChangeRecognizedAmountInput: (value: string) => void;
  onChangeRecognizedAt: (value: string) => void;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4"
      role="dialog"
    >
      <div className="w-full max-w-xl rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Confirmacao de recebimento
          </p>
          <h3 className="mt-2 text-xl font-semibold text-slate-950">
            Marcar receita como recebida
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Confirme o valor recebido para atualizar os totais operacionais e o
            detalhe do contrato.
          </p>
        </div>

        <div className="mt-5 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          <div className="flex flex-wrap justify-between gap-2">
            <span className="font-medium text-slate-500">Cliente</span>
            <span>{entry.clientName}</span>
          </div>
          <div className="flex flex-wrap justify-between gap-2">
            <span className="font-medium text-slate-500">Contrato</span>
            <span>{entry.contractNumber ? `Contrato ${entry.contractNumber}` : "Sem numero"}</span>
          </div>
          <div className="flex flex-wrap justify-between gap-2">
            <span className="font-medium text-slate-500">Vencimento</span>
            <span>{formatDate(entry.dueDate) ?? "Sem vencimento informado"}</span>
          </div>
          <div className="flex flex-wrap justify-between gap-2">
            <span className="font-medium text-slate-500">Saldo pendente</span>
            <span className="font-semibold text-slate-950">
              {currencyFormatter.format(pendingAmount)}
            </span>
          </div>
        </div>

        <div className="mt-5 grid gap-4">
          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">
              Valor recebido
            </span>
            <input
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400"
              disabled={isSubmitting}
              inputMode="decimal"
              onChange={(event) => onChangeRecognizedAmountInput(event.target.value)}
              placeholder="Ex.: 1040"
              type="text"
              value={recognizedAmountInput}
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">
              Data de recebimento
            </span>
            <input
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400"
              disabled={isSubmitting}
              onChange={(event) => onChangeRecognizedAt(event.target.value)}
              type="date"
              value={recognizedAt}
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">
              Observacao opcional
            </span>
            <textarea
              className="min-h-24 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400"
              disabled={isSubmitting}
              onChange={(event) => onChangeNotes(event.target.value)}
              placeholder="Ex.: recebido via transferencia no fechamento do dia."
              value={notes}
            />
          </label>
        </div>

        {error ? (
          <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
            {error}
          </div>
        ) : null}

        <div className="mt-5 flex flex-wrap justify-end gap-3">
          <button
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
            onClick={onClose}
            type="button"
          >
            Cancelar
          </button>
          <button
            className="rounded-lg border border-emerald-200 bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
            onClick={() => void onConfirm()}
            type="button"
          >
            {isSubmitting ? "Confirmando..." : "Confirmar recebimento"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ValuePair({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500 lg:hidden">
        {label}
      </p>
      <p className="text-sm text-slate-700">{value}</p>
    </div>
  );
}

function formatDate(value: string | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return dateFormatter.format(date);
}

function formatCompetency(value: string | undefined) {
  if (!value) {
    return null;
  }

  const [year, month] = value.split("-");

  if (!year || !month) {
    return value;
  }

  return `${month}/${year}`;
}

function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function normalizeCurrencyInput(value: string) {
  const normalized = value.replace(/\s/g, "").replace(",", ".");
  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : 0;
}

function todayDateInputValue() {
  const today = new Date();

  return [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");
}
