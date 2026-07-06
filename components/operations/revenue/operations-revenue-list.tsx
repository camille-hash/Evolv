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

type RevenueGroup = {
  dateKey: string;
  entries: OperationsRevenueRow[];
  expectedAmount: number;
  pendingAmount: number;
  recognizedAmount: number;
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  currency: "BRL",
  maximumFractionDigits: 0,
  style: "currency",
});

const statusLabels: Record<OperationsRevenueStatus, string> = {
  attention: "Atencao",
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
  const [recognizedAt, setRecognizedAt] = useState(todayDateInputValue);
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
    return <OperationsRevenueEmptyState />;
  }

  const groups = groupRevenueEntries(entries);

  return (
    <>
      <section className="grid gap-4">
        {groups.map((group) => (
          <article
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            key={group.dateKey}
          >
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Vencimento
                </p>
                <h2 className="mt-2 text-xl font-semibold text-slate-950">
                  {formatDateLabel(group.dateKey)}
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  {group.entries.length} receita(s) previstas para esta data.
                </p>
              </div>
              <div className="grid min-w-[280px] gap-3 sm:grid-cols-3">
                <SummaryValue
                  label="Previsto"
                  value={currencyFormatter.format(group.expectedAmount)}
                />
                <SummaryValue
                  label="Reconhecido"
                  value={currencyFormatter.format(group.recognizedAmount)}
                />
                <SummaryValue
                  label="Saldo"
                  value={currencyFormatter.format(group.pendingAmount)}
                />
              </div>
            </div>

            <div className="mt-4 grid gap-3">
              {group.entries.map((entry) => {
                const pendingAmount = roundCurrency(
                  Math.max(entry.expectedAmount - entry.recognizedAmount, 0),
                );

                return (
                  <div
                    className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3"
                    key={entry.id}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-semibold text-slate-950">
                            {entry.clientName}
                          </h3>
                          <span
                            className={`rounded-full border px-2 py-1 text-[11px] font-semibold ${statusClasses[entry.status]}`}
                          >
                            {statusLabels[entry.status]}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-slate-600">
                          {entry.contractNumber
                            ? `Contrato ${entry.contractNumber}`
                            : "Contrato nao identificado"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {entry.administratorName}
                        </p>
                      </div>
                      <div className="grid gap-2 text-right">
                        <div className="grid gap-1">
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                            Previsto
                          </p>
                          <p className="text-sm font-semibold text-slate-950">
                            {currencyFormatter.format(entry.expectedAmount)}
                          </p>
                          <p className="text-xs text-slate-500">
                            Reconhecido {currencyFormatter.format(entry.recognizedAmount)}
                          </p>
                          <p className="text-xs text-slate-500">
                            Saldo {currencyFormatter.format(pendingAmount)}
                          </p>
                        </div>
                        {pendingAmount > 0 ? (
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
                        ) : null}
                      </div>
                    </div>

                    {entry.attentionItems.length ? (
                      <div className="mt-3 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                        {entry.attentionItems.join(" | ")}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </article>
        ))}
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
  const dueDateLabel = entry.dueDate
    ? formatDateLabel(normalizeDateKey(entry.dueDate) ?? "sem-data")
    : "Sem vencimento informado";

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
            <span>{dueDateLabel}</span>
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

function groupRevenueEntries(entries: OperationsRevenueRow[]) {
  const groups = new Map<string, RevenueGroup>();

  const sortedEntries = [...entries].sort((left, right) => {
    const leftDate = normalizeDateKey(left.dueDate) ?? "9999-12-31";
    const rightDate = normalizeDateKey(right.dueDate) ?? "9999-12-31";

    if (leftDate !== rightDate) {
      return leftDate.localeCompare(rightDate);
    }

    const leftClient = left.clientName.toLocaleLowerCase("pt-BR");
    const rightClient = right.clientName.toLocaleLowerCase("pt-BR");

    if (leftClient !== rightClient) {
      return leftClient.localeCompare(rightClient);
    }

    return (left.contractNumber ?? "").localeCompare(right.contractNumber ?? "");
  });

  for (const entry of sortedEntries) {
    const dateKey = normalizeDateKey(entry.dueDate) ?? "sem-data";
    const current = groups.get(dateKey) ?? {
      dateKey,
      entries: [],
      expectedAmount: 0,
      pendingAmount: 0,
      recognizedAmount: 0,
    };

    current.entries.push(entry);
    current.expectedAmount = roundCurrency(current.expectedAmount + entry.expectedAmount);
    current.recognizedAmount = roundCurrency(
      current.recognizedAmount + entry.recognizedAmount,
    );
    current.pendingAmount = roundCurrency(
      current.pendingAmount +
        Math.max(entry.expectedAmount - entry.recognizedAmount, 0),
    );

    groups.set(dateKey, current);
  }

  return Array.from(groups.values()).sort((left, right) => {
    if (left.dateKey === "sem-data") {
      return 1;
    }

    if (right.dateKey === "sem-data") {
      return -1;
    }

    return left.dateKey.localeCompare(right.dateKey);
  });
}

function SummaryValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function formatDateLabel(dateKey: string) {
  if (dateKey === "sem-data") {
    return "Sem vencimento informado";
  }

  const date = new Date(`${dateKey}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return "Sem vencimento informado";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function normalizeDateKey(value: string | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
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
