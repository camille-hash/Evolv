import type {
  OperationsAdministratorRow,
  OperationsAdministratorStatus,
} from "@/modules/operations/administrators-types";
import { OperationsContextLink } from "../operations-context-link";

type OperationsAdministratorCardProps = {
  administrator: OperationsAdministratorRow;
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  currency: "BRL",
  maximumFractionDigits: 0,
  style: "currency",
});

const statusLabels: Record<OperationsAdministratorStatus, string> = {
  attention: "Atencao",
  concentrated: "Concentrada",
  healthy: "Saudavel",
  inactive: "Inativa",
  unknown: "Indefinida",
};

const statusClasses: Record<OperationsAdministratorStatus, string> = {
  attention: "border-amber-200 bg-amber-50 text-amber-800",
  concentrated: "border-orange-200 bg-orange-50 text-orange-800",
  healthy: "border-emerald-200 bg-emerald-50 text-emerald-800",
  inactive: "border-slate-200 bg-slate-50 text-slate-700",
  unknown: "border-slate-200 bg-slate-50 text-slate-500",
};

export function OperationsAdministratorCard({
  administrator,
}: OperationsAdministratorCardProps) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-slate-950">
              {administrator.name}
            </h3>
            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClasses[administrator.status]}`}
            >
              {statusLabels[administrator.status]}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {administrator.exposurePercentage.toLocaleString("pt-BR")}% da
            carteira
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ValueBlock label="Contratos" value={String(administrator.contractsCount)} />
        <ValueBlock
          label="Contratos ativos"
          value={String(administrator.activeContractsCount)}
        />
        <ValueBlock label="Clientes" value={String(administrator.clientsCount)} />
        <ValueBlock
          label="Credito"
          value={currencyFormatter.format(administrator.totalCreditValue)}
        />
        <ValueBlock
          label="Receita estimada"
          value={currencyFormatter.format(administrator.estimatedRevenue)}
        />
        <ValueBlock
          label="Receita reconhecida"
          value={currencyFormatter.format(administrator.recognizedRevenue)}
        />
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>Exposicao</span>
          <span>{administrator.exposurePercentage.toLocaleString("pt-BR")}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-slate-900"
            style={{
              width: `${Math.min(administrator.exposurePercentage, 100)}%`,
            }}
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <OperationsContextLink href="/operations/contracts">
          Ver contratos
        </OperationsContextLink>
        <OperationsContextLink href="/operations/clients">
          Ver clientes
        </OperationsContextLink>
        <OperationsContextLink href="/operations/revenue">
          Ver receita
        </OperationsContextLink>
        <OperationsContextLink href="/operations/portfolio">
          Ver carteira
        </OperationsContextLink>
      </div>

      {administrator.attentionItems.length ? (
        <div className="mt-4 rounded-lg border border-amber-100 bg-amber-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-800">
            Pontos de atencao
          </p>
          <ul className="mt-2 grid gap-1.5 text-sm text-amber-900">
            {administrator.attentionItems.map((item) => (
              <li key={item}>- {item}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </article>
  );
}

function ValueBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-950">{value}</p>
    </div>
  );
}
