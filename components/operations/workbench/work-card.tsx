import { OperationsContextLink } from "../operations-context-link";
import type { WorkbenchItem } from "@/modules/operations/workbench/types";

type WorkCardProps = {
  item: WorkbenchItem;
};

const toneClasses = {
  atencao: "border-amber-200 bg-amber-50",
  concluido: "border-emerald-200 bg-emerald-50",
  critico: "border-rose-200 bg-rose-50",
  neutro: "border-slate-200 bg-slate-50",
} as const;

const chipClasses = {
  atencao: "border-amber-200 bg-amber-100 text-amber-800",
  concluido: "border-emerald-200 bg-emerald-100 text-emerald-800",
  critico: "border-rose-200 bg-rose-100 text-rose-800",
  neutro: "border-slate-200 bg-white text-slate-700",
} as const;

export function WorkCard({ item }: WorkCardProps) {
  return (
    <article className={`rounded-xl border p-4 shadow-sm ${toneClasses[item.tone]}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span
            className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${chipClasses[item.tone]}`}
          >
            {item.tipo}
          </span>
          <h3 className="mt-3 text-base font-semibold text-slate-950">
            {item.titulo}
          </h3>
        </div>
        <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600">
          {item.situacao}
        </span>
      </div>

      <p className="mt-3 text-sm leading-6 text-slate-700">{item.resumo}</p>

      <div className="mt-4 rounded-lg bg-white/80 px-3 py-3">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          Próxima ação
        </p>
        <p className="mt-2 text-sm font-medium text-slate-900">
          {item.proximaAcao}
        </p>
      </div>

      {item.href && item.actionLabel ? (
        <div className="mt-4">
          <OperationsContextLink href={item.href}>
            {item.actionLabel}
          </OperationsContextLink>
        </div>
      ) : null}
    </article>
  );
}
