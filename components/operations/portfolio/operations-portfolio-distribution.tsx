import type {
  OperationsPortfolioExposureRow,
  OperationsPortfolioStatus,
} from "@/modules/operations/portfolio-types";
import { OperationsContextLink } from "../operations-context-link";

type OperationsPortfolioDistributionProps = {
  administratorExposures: OperationsPortfolioExposureRow[];
  clientExposures: OperationsPortfolioExposureRow[];
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  currency: "BRL",
  maximumFractionDigits: 0,
  style: "currency",
});

const statusLabels: Record<OperationsPortfolioStatus, string> = {
  attention: "Atencao",
  concentrated: "Concentrada",
  empty: "Vazia",
  healthy: "Saudavel",
  unknown: "Indefinida",
};

const statusClasses: Record<OperationsPortfolioStatus, string> = {
  attention: "border-amber-200 bg-amber-50 text-amber-800",
  concentrated: "border-orange-200 bg-orange-50 text-orange-800",
  empty: "border-slate-200 bg-slate-50 text-slate-600",
  healthy: "border-emerald-200 bg-emerald-50 text-emerald-800",
  unknown: "border-slate-200 bg-slate-50 text-slate-500",
};

export function OperationsPortfolioDistribution({
  administratorExposures,
  clientExposures,
}: OperationsPortfolioDistributionProps) {
  return (
    <section className="grid gap-5 xl:grid-cols-2">
      <ExposureSection exposures={clientExposures} title="Por cliente" />
      <ExposureSection
        exposures={administratorExposures}
        title="Por administradora"
      />
    </section>
  );
}

function ExposureSection({
  exposures,
  title,
}: {
  exposures: OperationsPortfolioExposureRow[];
  title: string;
}) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Distribuicao
        </p>
        <h2 className="mt-1 text-lg font-semibold text-slate-950">{title}</h2>
      </div>

      {exposures.length ? (
        <div className="grid gap-3">
          {exposures.map((exposure) => (
            <ExposureRow exposure={exposure} key={exposure.id} />
          ))}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
          Nenhuma exposicao operacional encontrada.
        </p>
      )}
    </article>
  );
}

function ExposureRow({ exposure }: { exposure: OperationsPortfolioExposureRow }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-950">
            {exposure.label}
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            {exposure.contractsCount} contratos ·{" "}
            {currencyFormatter.format(exposure.totalCreditValue)}
          </p>
        </div>
        <span
          className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClasses[exposure.status]}`}
        >
          {statusLabels[exposure.status]}
        </span>
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>Exposicao</span>
          <span>{exposure.exposurePercentage.toLocaleString("pt-BR")}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
          <div
            className="h-full rounded-full bg-slate-900"
            style={{ width: `${Math.min(exposure.exposurePercentage, 100)}%` }}
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <OperationsContextLink
          href={
            exposure.type === "client"
              ? "/operations/clients"
              : "/operations/administrators"
          }
        >
          {exposure.type === "client" ? "Ver clientes" : "Ver administradoras"}
        </OperationsContextLink>
        <OperationsContextLink href="/operations/contracts">
          Ver contratos
        </OperationsContextLink>
      </div>

      {exposure.attentionItems.length ? (
        <ul className="mt-3 grid gap-1 text-xs text-amber-800">
          {exposure.attentionItems.map((item) => (
            <li key={item}>- {item}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
