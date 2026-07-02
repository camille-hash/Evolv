import type {
  OperationsClientRow,
  OperationsClientStatus,
} from "@/modules/operations/clients-types";
import { OperationsContextLink } from "../operations-context-link";

type OperationsClientCardProps = {
  client: OperationsClientRow;
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  currency: "BRL",
  maximumFractionDigits: 0,
  style: "currency",
});

const statusLabels: Record<OperationsClientStatus, string> = {
  active: "Ativo",
  attention: "Atencao",
  inactive: "Inativo",
  unknown: "Indefinido",
};

const statusClasses: Record<OperationsClientStatus, string> = {
  active: "border-emerald-200 bg-emerald-50 text-emerald-800",
  attention: "border-amber-200 bg-amber-50 text-amber-800",
  inactive: "border-slate-200 bg-slate-50 text-slate-700",
  unknown: "border-slate-200 bg-slate-50 text-slate-500",
};

export function OperationsClientCard({ client }: OperationsClientCardProps) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-slate-950">
              {client.name}
            </h3>
            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClasses[client.status]}`}
            >
              {statusLabels[client.status]}
            </span>
          </div>

          {client.email || client.phone ? (
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
              {client.email ? <span>{client.email}</span> : null}
              {client.phone ? <span>{client.phone}</span> : null}
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <ValueBlock label="Contratos" value={String(client.contractsCount)} />
        <ValueBlock
          label="Contratos ativos"
          value={String(client.activeContractsCount)}
        />
        <ValueBlock
          label="Credito"
          value={currencyFormatter.format(client.totalCreditValue)}
        />
        <ValueBlock
          label="Receita estimada"
          value={currencyFormatter.format(client.estimatedRevenue)}
        />
        <ValueBlock
          label="Receita reconhecida"
          value={currencyFormatter.format(client.recognizedRevenue)}
        />
      </div>

      {client.administrators.length ? (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
            Administradoras
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {client.administrators.map((administrator) => (
              <span
                className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600"
                key={administrator}
              >
                {administrator}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <OperationsContextLink href="/operations/contracts">
          Ver contratos
        </OperationsContextLink>
        <OperationsContextLink href="/operations/revenue">
          Ver receita
        </OperationsContextLink>
        <OperationsContextLink href="/operations/portfolio">
          Ver carteira
        </OperationsContextLink>
      </div>

      {client.attentionItems.length ? (
        <div className="mt-4 rounded-lg border border-amber-100 bg-amber-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-800">
            Pontos de atencao
          </p>
          <ul className="mt-2 grid gap-1.5 text-sm text-amber-900">
            {client.attentionItems.map((item) => (
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
