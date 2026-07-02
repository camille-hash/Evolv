import type {
  OperationalHealthStatus,
  OperationsSnapshotMetric,
} from "@/modules/operations/types";

type OperationalSnapshotCardProps = {
  generatedAt: string;
  healthStatus: OperationalHealthStatus;
  snapshot: OperationsSnapshotMetric[];
};

const toneClasses: Record<OperationalHealthStatus, string> = {
  attention: "border-amber-200 bg-amber-50 text-amber-800",
  critical: "border-rose-200 bg-rose-50 text-rose-800",
  healthy: "border-emerald-200 bg-emerald-50 text-emerald-800",
  neutral: "border-slate-200 bg-slate-50 text-slate-700",
};

export function OperationalSnapshotCard({
  generatedAt,
  healthStatus,
  snapshot,
}: OperationalSnapshotCardProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Operational Snapshot
          </p>
          <h2 className="mt-1 text-xl font-semibold text-slate-950">
            Visao operacional consolidada
          </h2>
        </div>
        <div
          className={`rounded-full border px-3 py-1 text-xs font-semibold ${toneClasses[healthStatus]}`}
        >
          {formatStatus(healthStatus)}
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {snapshot.map((metric) => (
          <div
            className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3"
            key={metric.id}
          >
            <p className="text-xs text-slate-500">{metric.label}</p>
            <p className="mt-2 text-lg font-semibold text-slate-950">
              {metric.value}
            </p>
          </div>
        ))}
      </div>

      <p className="mt-4 text-xs text-slate-400">
        Atualizado em {formatDateTime(generatedAt)}
      </p>
    </section>
  );
}

function formatStatus(status: OperationalHealthStatus) {
  if (status === "critical") {
    return "Critico";
  }

  if (status === "attention") {
    return "Atencao";
  }

  if (status === "neutral") {
    return "Neutro";
  }

  return "Saudavel";
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}
