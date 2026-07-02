import type {
  OperationAttentionArea,
  OperationAttentionItem,
  OperationAttentionSeverity,
} from "@/modules/operations/types";
import { OperationalEmptyState } from "./operational-empty-state";

type OperationsAttentionBoardProps = {
  items: OperationAttentionItem[];
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

export function OperationsAttentionBoard({
  items,
}: OperationsAttentionBoardProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Attention Board
        </p>
        <h2 className="mt-1 text-lg font-semibold text-slate-950">
          Pontos que pedem acompanhamento
        </h2>
      </div>

      <div className="mt-4">
        {items.length ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {items.map((item) => (
              <article
                className="rounded-lg border border-slate-100 bg-slate-50 p-4"
                key={item.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-slate-950">
                        {item.title}
                      </p>
                      <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-500">
                        {areaLabels[item.area]}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      {item.description}
                    </p>
                  </div>
                  <span
                    className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${severityClasses[item.severity]}`}
                  >
                    {item.value}
                  </span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <OperationalEmptyState
            description="Nenhum ponto critico identificado nos read models operacionais."
            title="Operacao sem alertas relevantes"
          />
        )}
      </div>
    </section>
  );
}
