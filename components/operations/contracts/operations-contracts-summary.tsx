import type { OperationsContractsSummary } from "@/modules/operations/contracts-types";

type OperationsContractsSummaryProps = {
  summary: OperationsContractsSummary;
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  currency: "BRL",
  maximumFractionDigits: 0,
  style: "currency",
});

export function OperationsContractsSummary({
  summary,
}: OperationsContractsSummaryProps) {
  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <SummaryMetric label="Total de contratos" value={String(summary.totalContracts)} />
      <SummaryMetric label="Contratos ativos" value={String(summary.activeContracts)} />
      <SummaryMetric
        label="Contratos com atencao"
        value={String(summary.attentionContracts)}
      />
      <SummaryMetric
        label="Credito total"
        value={currencyFormatter.format(summary.totalCreditValue)}
      />
      <SummaryMetric
        label="Credito ativo"
        value={currencyFormatter.format(summary.activeCreditValue)}
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
