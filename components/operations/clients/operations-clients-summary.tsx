import type { OperationsClientsSummary } from "@/modules/operations/clients-types";

type OperationsClientsSummaryProps = {
  summary: OperationsClientsSummary;
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  currency: "BRL",
  maximumFractionDigits: 0,
  style: "currency",
});

export function OperationsClientsSummary({
  summary,
}: OperationsClientsSummaryProps) {
  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <SummaryMetric label="Total de clientes" value={String(summary.totalClients)} />
      <SummaryMetric label="Clientes ativos" value={String(summary.activeClients)} />
      <SummaryMetric
        label="Com contratos"
        value={String(summary.clientsWithContracts)}
      />
      <SummaryMetric
        label="Sem contratos"
        value={String(summary.clientsWithoutContracts)}
      />
      <SummaryMetric
        label="Com atencao"
        value={String(summary.clientsWithAttention)}
      />
      <SummaryMetric
        label="Credito total"
        value={currencyFormatter.format(summary.totalCreditValue)}
      />
      <SummaryMetric
        label="Receita estimada"
        value={currencyFormatter.format(summary.estimatedRevenue)}
      />
      <SummaryMetric
        label="Receita reconhecida"
        value={currencyFormatter.format(summary.recognizedRevenue)}
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
