import type { MasterDataIntegrityContractsSummary } from "@/modules/master-data-integrity/types";

type OperationsIntegritySummaryProps = {
  summary: MasterDataIntegrityContractsSummary;
};

const summaryCards = [
  {
    key: "totalContracts",
    label: "Contratos lidos",
  },
  {
    key: "contractsWithIssues",
    label: "Contratos com issue",
  },
  {
    key: "totalIssues",
    label: "Issues totais",
  },
  {
    key: "errors",
    label: "Errors",
  },
  {
    key: "warnings",
    label: "Warnings",
  },
] as const satisfies Array<{
  key: keyof Pick<
    MasterDataIntegrityContractsSummary,
    "contractsWithIssues" | "errors" | "totalContracts" | "totalIssues" | "warnings"
  >;
  label: string;
}>;

export function OperationsIntegritySummary({
  summary,
}: OperationsIntegritySummaryProps) {
  return (
    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
      {summaryCards.map((card) => (
        <article
          className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          key={card.key}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            {card.label}
          </p>
          <p className="mt-3 text-3xl font-semibold text-slate-950">
            {summary[card.key]}
          </p>
        </article>
      ))}
      <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:col-span-2 xl:col-span-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          Ultima leitura
        </p>
        <p className="mt-2 text-sm text-slate-700">
          {formatDateTime(summary.scannedAt)}
        </p>
      </article>
    </section>
  );
}

function formatDateTime(value: string) {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "Leitura indisponivel.";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(parsed);
}
