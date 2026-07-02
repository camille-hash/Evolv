import type {
  OperationsHealthScore,
  OperationsHealthScoreStatus,
} from "@/modules/operations/health-score-types";

type OperationsHealthScoreCardProps = {
  healthScore: OperationsHealthScore;
};

const statusClasses: Record<OperationsHealthScoreStatus, string> = {
  attention: "border-amber-200 bg-amber-50 text-amber-950",
  critical: "border-rose-200 bg-rose-50 text-rose-950",
  healthy: "border-emerald-200 bg-emerald-50 text-emerald-950",
  stable: "border-sky-200 bg-sky-50 text-sky-950",
};

const factorClasses: Record<
  OperationsHealthScore["factors"][number]["impact"],
  string
> = {
  negative: "border-rose-200 bg-white text-rose-800",
  neutral: "border-slate-200 bg-white text-slate-600",
  positive: "border-emerald-200 bg-white text-emerald-800",
};

export function OperationsHealthScoreCard({
  healthScore,
}: OperationsHealthScoreCardProps) {
  return (
    <section
      className={`rounded-xl border p-5 shadow-sm ${statusClasses[healthScore.status]}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-75">
            Health Score
          </p>
          <h2 className="mt-2 text-lg font-semibold">{healthScore.title}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 opacity-80">
            {healthScore.description}
          </p>
        </div>

        <div className="rounded-xl bg-white/75 px-5 py-4 text-right shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] opacity-60">
            Score
          </p>
          <p className="mt-1 text-4xl font-semibold">{healthScore.score}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-5">
        {healthScore.factors.map((factor) => (
          <article
            className={`rounded-lg border px-3 py-2 ${factorClasses[factor.impact]}`}
            key={factor.id}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.12em]">
              {factor.label}
            </p>
            <p className="mt-1 text-xs leading-5 opacity-80">
              {factor.description}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
