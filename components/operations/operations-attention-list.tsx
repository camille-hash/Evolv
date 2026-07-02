import type {
  OperationAttentionArea,
  OperationAttentionItem,
  OperationAttentionSeverity,
} from "@/modules/operations/types";
import { OperationsContextLink } from "./operations-context-link";
import { OperationalEmptyState } from "./operational-empty-state";

type OperationsAttentionListProps = {
  items: OperationAttentionItem[];
};

const severityLabels: Record<OperationAttentionSeverity, string> = {
  critical: "Crítica",
  high: "Alta",
  low: "Baixa",
  medium: "Média",
};

const severityClasses: Record<OperationAttentionSeverity, string> = {
  critical: "border-rose-200 bg-rose-50 text-rose-800",
  high: "border-amber-200 bg-amber-50 text-amber-800",
  low: "border-slate-200 bg-slate-50 text-slate-700",
  medium: "border-sky-200 bg-sky-50 text-sky-800",
};

const areaLabels: Record<OperationAttentionArea, string> = {
  administrators: "Administradoras",
  clients: "Clientes",
  contracts: "Contratos",
  portfolio: "Carteira",
  revenue: "Receita",
};

export function OperationsAttentionList({ items }: OperationsAttentionListProps) {
  if (!items.length) {
    return (
      <OperationalEmptyState
        description="A operação não apresenta pontos críticos com base nas regras atuais de leitura."
        title="Nenhuma pendência operacional identificada."
      />
    );
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Lista operacional
        </p>
        <h2 className="mt-1 text-lg font-semibold text-slate-950">
          Pendências identificadas
        </h2>
      </div>

      <div className="mt-4 grid gap-3">
        {items.map((item) => (
          <article
            className="rounded-lg border border-slate-100 bg-slate-50 p-4"
            key={item.id}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-semibold text-slate-950">
                    {item.title}
                  </h3>
                  <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-500">
                    {areaLabels[item.area]}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {item.description}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <span
                  className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${severityClasses[item.severity]}`}
                >
                  {severityLabels[item.severity]}
                </span>
                <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">
                  {item.value}
                </span>
              </div>
            </div>

            {item.href ? (
              <div className="mt-4">
                <OperationsContextLink href={item.href}>
                  Abrir contexto
                </OperationsContextLink>
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
