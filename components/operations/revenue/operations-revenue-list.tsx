"use client";

import type {
  OperationsRevenueRow,
  OperationsRevenueStatus,
} from "@/modules/operations/revenue-types";
import { OperationsRevenueEmptyState } from "./operations-revenue-empty-state";

type OperationsRevenueListProps = {
  entries: OperationsRevenueRow[];
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

export function OperationsRevenueList({ entries }: OperationsRevenueListProps) {
  if (!entries.length) {
    return <OperationsRevenueEmptyState />;
  }

  const groups = groupRevenueEntries(entries);

  return (
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
            {group.entries.map((entry) => (
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
                  <div className="grid gap-1 text-right">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Previsto
                    </p>
                    <p className="text-sm font-semibold text-slate-950">
                      {currencyFormatter.format(entry.expectedAmount)}
                    </p>
                    <p className="text-xs text-slate-500">
                      Reconhecido {currencyFormatter.format(entry.recognizedAmount)}
                    </p>
                  </div>
                </div>

                {entry.attentionItems.length ? (
                  <div className="mt-3 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                    {entry.attentionItems.join(" | ")}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </article>
      ))}
    </section>
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
