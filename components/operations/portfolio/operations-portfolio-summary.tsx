import type { OperationsPortfolioSummary } from "@/modules/operations/portfolio-types";

type OperationsPortfolioSummaryProps = {
  summary: OperationsPortfolioSummary;
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  currency: "BRL",
  maximumFractionDigits: 0,
  style: "currency",
});

export function OperationsPortfolioSummary({
  summary,
}: OperationsPortfolioSummaryProps) {
  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <SummaryMetric
        label="Valor total da carteira"
        value={currencyFormatter.format(summary.totalPortfolioValue)}
      />
      <SummaryMetric label="Contratos" value={String(summary.totalContracts)} />
      <SummaryMetric label="Clientes" value={String(summary.totalClients)} />
      <SummaryMetric
        label="Administradoras"
        value={String(summary.totalAdministrators)}
      />
      <SummaryMetric
        label="Receita estimada"
        value={currencyFormatter.format(summary.estimatedRevenue)}
      />
      <SummaryMetric
        label="Receita reconhecida"
        value={currencyFormatter.format(summary.recognizedRevenue)}
      />
      <SummaryMetric
        label="Maior exposicao cliente"
        value={`${summary.largestClientExposurePercentage.toLocaleString("pt-BR")}%`}
      />
      <SummaryMetric
        label="Maior exposicao administradora"
        value={`${summary.largestAdministratorExposurePercentage.toLocaleString("pt-BR")}%`}
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
