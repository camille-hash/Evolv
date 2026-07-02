import Link from "next/link";
import type {
  OperationsTimelineArea,
  OperationsTimelineItem as OperationsTimelineItemType,
  OperationsTimelineSeverity,
} from "@/modules/operations/timeline-types";

type OperationsTimelineItemProps = {
  item: OperationsTimelineItemType;
};

const areaLabels: Record<OperationsTimelineArea, string> = {
  administrators: "Administradoras",
  attention: "Pendencias",
  clients: "Clientes",
  contracts: "Contratos",
  operation: "Operacao",
  portfolio: "Carteira",
  revenue: "Receita",
};

const severityClasses: Record<OperationsTimelineSeverity, string> = {
  attention: "border-amber-200 bg-amber-50 text-amber-800",
  critical: "border-rose-200 bg-rose-50 text-rose-800",
  info: "border-slate-200 bg-white text-slate-600",
};

export function OperationsTimelineItem({ item }: OperationsTimelineItemProps) {
  return (
    <article className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-950">
              {item.title}
            </h3>
            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-500">
              {areaLabels[item.area]}
            </span>
            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${severityClasses[item.severity]}`}
            >
              {formatSeverity(item.severity)}
            </span>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            {item.description}
          </p>
          {item.href ? (
            <Link
              className="mt-3 inline-flex text-xs font-semibold text-slate-600 underline-offset-4 hover:text-slate-950 hover:underline"
              href={item.href}
            >
              Abrir contexto
            </Link>
          ) : null}
        </div>
        <span className="shrink-0 text-xs text-slate-400">
          {formatDate(item.occurredAt)}
        </span>
      </div>
    </article>
  );
}

function formatSeverity(severity: OperationsTimelineSeverity) {
  if (severity === "critical") {
    return "Critica";
  }

  if (severity === "attention") {
    return "Atencao";
  }

  return "Info";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}
