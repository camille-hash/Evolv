"use client";

import type { RevenueEntry } from "@/modules/revenue/types";

type ContractRevenueCardProps = {
  revenueEntries: RevenueEntry[];
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  currency: "BRL",
  style: "currency",
});

export function ContractRevenueCard({
  revenueEntries,
}: ContractRevenueCardProps) {
  const expectedTotal = revenueEntries.reduce(
    (total, entry) =>
      entry.status === "cancelled" ? total : total + entry.expectedAmount,
    0,
  );

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            Receita prevista
          </h3>
          <p className="text-xs text-slate-500">
            Entries geradas pelo Revenue Engine.
          </p>
        </div>
        <span className="text-sm font-semibold text-emerald-700">
          {currencyFormatter.format(expectedTotal)}
        </span>
      </div>

      <div className="mt-3 space-y-2">
        {revenueEntries.length ? (
          revenueEntries.map((entry) => (
            <div
              className="flex items-center justify-between gap-3 rounded-md bg-slate-50 px-3 py-2 text-sm"
              key={entry.id}
            >
              <div>
                <p className="font-medium text-slate-800">
                  {entry.dueDate ?? "Sem vencimento"}
                </p>
                <p className="text-xs text-slate-500">{entry.status}</p>
              </div>
              <span className="font-semibold text-slate-900">
                {currencyFormatter.format(entry.expectedAmount)}
              </span>
            </div>
          ))
        ) : (
          <p className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-500">
            Nenhuma receita prevista gerada.
          </p>
        )}
      </div>
    </section>
  );
}
