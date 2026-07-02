import type { OperationMovementItem } from "@/modules/operations/types";
import { OperationalEmptyState } from "./operational-empty-state";

type OperationsMovementFeedProps = {
  movements: OperationMovementItem[];
};

export function OperationsMovementFeed({ movements }: OperationsMovementFeedProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Movement Feed
        </p>
        <h2 className="mt-1 text-lg font-semibold text-slate-950">
          Movimento operacional recente
        </h2>
      </div>

      <div className="mt-4">
        {movements.length ? (
          <div className="space-y-3">
            {movements.map((movement) => (
              <article
                className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3"
                key={movement.id}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-950">
                      {movement.title}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {movement.description}
                    </p>
                  </div>
                  <span className="text-xs text-slate-400">
                    {formatDate(movement.occurredAt)}
                  </span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <OperationalEmptyState
            description="Ainda nao ha movimento suficiente nos dados consolidados."
            title="Sem movimentacao operacional"
          />
        )}
      </div>
    </section>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}
