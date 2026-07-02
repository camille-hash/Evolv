import type {
  OperationDrilldownCard,
  OperationalHealthStatus,
} from "@/modules/operations/types";

type OperationsDrilldownCardProps = {
  card: OperationDrilldownCard;
};

const statusClasses: Record<OperationalHealthStatus, string> = {
  attention: "bg-amber-500",
  critical: "bg-rose-500",
  healthy: "bg-emerald-500",
  neutral: "bg-slate-400",
};

export function OperationsDrilldownCard({ card }: OperationsDrilldownCardProps) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-950">{card.label}</p>
          <p className="mt-1 text-sm text-slate-500">{card.description}</p>
        </div>
        <span
          className={`mt-1 h-2.5 w-2.5 rounded-full ${statusClasses[card.status]}`}
        />
      </div>
      <p className="mt-5 text-2xl font-semibold text-slate-950">
        {card.value}
      </p>
    </article>
  );
}
