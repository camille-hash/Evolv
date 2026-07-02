import type { OperationsAdministratorsSummary } from "@/modules/operations/administrators-types";

type OperationsAdministratorsSummaryProps = {
  summary: OperationsAdministratorsSummary;
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  currency: "BRL",
  maximumFractionDigits: 0,
  style: "currency",
});

export function OperationsAdministratorsSummary({
  summary,
}: OperationsAdministratorsSummaryProps) {
  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <SummaryMetric
        label="Total de administradoras"
        value={String(summary.totalAdministrators)}
      />
      <SummaryMetric
        label="Administradoras ativas"
        value={String(summary.activeAdministrators)}
      />
      <SummaryMetric
        label="Com contratos"
        value={String(summary.administratorsWithContracts)}
      />
      <SummaryMetric
        label="Sem contratos"
        value={String(summary.administratorsWithoutContracts)}
      />
      <SummaryMetric
        label="Com atencao"
        value={String(summary.administratorsWithAttention)}
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
      <SummaryMetric
        label="Maior exposicao"
        value={`${summary.largestExposurePercentage.toLocaleString("pt-BR")}%`}
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
