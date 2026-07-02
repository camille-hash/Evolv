import type {
  OperationsRevenueRow,
  OperationsRevenueStatus,
} from "@/modules/operations/revenue-types";
import { OperationsContextLink } from "../operations-context-link";

type OperationsRevenueCardProps = {
  entry: OperationsRevenueRow;
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  currency: "BRL",
  maximumFractionDigits: 0,
  style: "currency",
});

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const statusLabels: Record<OperationsRevenueStatus, string> = {
  attention: "Atencao",
  cancelled: "Cancelada",
  expected: "Prevista",
  pending: "Pendente",
  recognized: "Reconhecida",
};

const statusClasses: Record<OperationsRevenueStatus, string> = {
  attention: "border-amber-200 bg-amber-50 text-amber-800",
  cancelled: "border-rose-200 bg-rose-50 text-rose-800",
  expected: "border-sky-200 bg-sky-50 text-sky-800",
  pending: "border-slate-200 bg-slate-50 text-slate-700",
  recognized: "border-emerald-200 bg-emerald-50 text-emerald-800",
};

export function OperationsRevenueCard({ entry }: OperationsRevenueCardProps) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-slate-950">
              {entry.clientName}
            </h3>
            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClasses[entry.status]}`}
            >
              {statusLabels[entry.status]}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {entry.administratorName}
          </p>
          <p className="mt-1 text-xs font-medium text-slate-400">
            {entry.contractNumber
              ? `Contrato ${entry.contractNumber}`
              : "Contrato nao identificado"}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ValueBlock
          label="Valor previsto"
          value={currencyFormatter.format(entry.expectedAmount)}
        />
        <ValueBlock
          label="Valor reconhecido"
          value={currencyFormatter.format(entry.recognizedAmount)}
        />
        <ValueBlock label="Vencimento" value={formatDate(entry.dueDate)} />
        <ValueBlock label="Pagamento" value={formatDate(entry.paidAt)} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <OperationsContextLink href="/operations/contracts">
          Ver contrato
        </OperationsContextLink>
        <OperationsContextLink href="/operations/clients">
          Ver cliente
        </OperationsContextLink>
        <OperationsContextLink href="/operations/administrators">
          Ver administradora
        </OperationsContextLink>
      </div>

      {entry.attentionItems.length ? (
        <div className="mt-4 rounded-lg border border-amber-100 bg-amber-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-800">
            Pontos de atencao
          </p>
          <ul className="mt-2 grid gap-1.5 text-sm text-amber-900">
            {entry.attentionItems.map((item) => (
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

function formatDate(value: string | undefined) {
  if (!value) {
    return "Nao informado";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Nao informado";
  }

  return dateFormatter.format(date);
}
