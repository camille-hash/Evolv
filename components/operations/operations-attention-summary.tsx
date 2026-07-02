import type {
  OperationAttentionItem,
  OperationAttentionSeverity,
} from "@/modules/operations/types";

type OperationsAttentionSummaryProps = {
  items: OperationAttentionItem[];
};

const trackedSeverities: OperationAttentionSeverity[] = [
  "high",
  "medium",
  "low",
];

const severityLabels: Record<OperationAttentionSeverity, string> = {
  critical: "Crítica",
  high: "Alta",
  low: "Baixa",
  medium: "Média",
};

export function OperationsAttentionSummary({
  items,
}: OperationsAttentionSummaryProps) {
  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <SummaryMetric label="Total" value={String(items.length)} />
      {trackedSeverities.map((severity) => (
        <SummaryMetric
          key={severity}
          label={severityLabels[severity]}
          value={String(
            items.filter((item) => item.severity === severity).length,
          )}
        />
      ))}
    </section>
  );
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p className="mt-3 text-3xl font-semibold text-slate-950">{value}</p>
    </article>
  );
}
