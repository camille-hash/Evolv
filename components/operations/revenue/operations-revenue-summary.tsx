import type { OperationsRevenueSummary } from "@/modules/operations/revenue-types";

type OperationsRevenueSummaryProps = {
  summary: OperationsRevenueSummary;
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  currency: "BRL",
  maximumFractionDigits: 0,
  style: "currency",
});

export function OperationsRevenueSummary({
  summary,
}: OperationsRevenueSummaryProps) {
  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <SummaryMetric
        label="Receita prevista"
        value={currencyFormatter.format(summary.expectedRevenue)}
      />
      <SummaryMetric
        label="Receita reconhecida"
        value={currencyFormatter.format(summary.recognizedRevenue)}
      />
      <SummaryMetric
        label="Receita pendente"
        value={currencyFormatter.format(summary.pendingRevenue)}
      />
      <SummaryMetric label="Divergencias" value={String(summary.divergentEntries)} />
      <SummaryMetric
        label="% reconhecida"
        value={`${summary.recognizedPercentage.toLocaleString("pt-BR")}%`}
      />
    </section>
  );
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p className="mt-3 text-2xl font-semibold text-slate-950">{value}</p>
    </article>
  );
}
