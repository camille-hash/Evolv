import Link from "next/link";
import type {
  OperationalInsight,
  OperationalInsightCategory,
  OperationalInsightSeverity,
} from "@/modules/operations/intelligence-types";

type OperationsInsightCardProps = {
  insight: OperationalInsight;
};

const categoryLabels: Record<OperationalInsightCategory, string> = {
  administrators: "Administradoras",
  clients: "Clientes",
  contracts: "Contratos",
  operation: "Operacao",
  portfolio: "Carteira",
  revenue: "Receita",
};

const severityLabels: Record<OperationalInsightSeverity, string> = {
  attention: "Atencao",
  critical: "Critico",
  info: "Informativo",
};

const severityClasses: Record<OperationalInsightSeverity, string> = {
  attention: "border-amber-200 bg-amber-50 text-amber-800",
  critical: "border-rose-200 bg-rose-50 text-rose-800",
  info: "border-sky-200 bg-sky-50 text-sky-800",
};

export function OperationsInsightCard({ insight }: OperationsInsightCardProps) {
  const content = (
    <article className="h-full rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            {categoryLabels[insight.category]}
          </p>
          <h3 className="mt-2 text-base font-semibold text-slate-950">
            {insight.title}
          </h3>
        </div>
        <span
          className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${severityClasses[insight.severity]}`}
        >
          {severityLabels[insight.severity]}
        </span>
      </div>

      <p className="mt-3 text-sm leading-6 text-slate-600">
        {insight.description}
      </p>

      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
        <span className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
          Prioridade
        </span>
        <span className="text-sm font-semibold text-slate-950">
          {insight.priority}
        </span>
      </div>
    </article>
  );

  if (!insight.href) {
    return content;
  }

  return (
    <Link aria-label={insight.title} className="block h-full" href={insight.href}>
      {content}
    </Link>
  );
}
