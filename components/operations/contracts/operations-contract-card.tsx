import type {
  OperationsContractRow,
  OperationsContractStatus,
} from "@/modules/operations/contracts-types";
import type { ContractStatus } from "@/modules/contracts/types";
import { OperationsContextLink } from "../operations-context-link";
import { ContractCommissionSummaryCard } from "./contract-commission-summary-card";

type OperationsContractCardProps = {
  contract: OperationsContractRow;
  onChangeStatus?: () => void;
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  currency: "BRL",
  maximumFractionDigits: 0,
  style: "currency",
});

const statusLabels: Record<OperationsContractStatus, string> = {
  active: "Ativo",
  attention: "Atencao",
  cancelled: "Cancelado",
  completed: "Concluido",
  inactive: "Inativo",
  pending: "Pendente",
  unknown: "Indefinido",
};

const statusClasses: Record<OperationsContractStatus, string> = {
  active: "border-emerald-200 bg-emerald-50 text-emerald-800",
  attention: "border-amber-200 bg-amber-50 text-amber-800",
  cancelled: "border-rose-200 bg-rose-50 text-rose-800",
  completed: "border-sky-200 bg-sky-50 text-sky-800",
  inactive: "border-slate-300 bg-slate-100 text-slate-700",
  pending: "border-slate-200 bg-slate-50 text-slate-700",
  unknown: "border-slate-200 bg-slate-50 text-slate-500",
};

export function OperationsContractCard({
  contract,
  onChangeStatus,
}: OperationsContractCardProps) {
  const currentContractStatus = normalizeContractStatus(contract.sourceStatus);

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-slate-950">
              {contract.clientName}
            </h3>
            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClasses[contract.status]}`}
            >
              {statusLabels[contract.status]}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {contract.administratorName}
          </p>
          {contract.contractNumber ? (
            <p className="mt-1 text-xs font-medium text-slate-400">
              Contrato {contract.contractNumber}
            </p>
          ) : null}
          {contract.group || contract.quota ? (
            <p className="mt-1 text-xs text-slate-400">
              {[contract.group ? `Grupo ${contract.group}` : null, contract.quota ? `Cota ${contract.quota}` : null]
                .filter(Boolean)
                .join(" | ")}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <ValueBlock
          label="Credito"
          value={currencyFormatter.format(contract.creditValue)}
        />
        <ValueBlock
          label="Receita estimada"
          value={currencyFormatter.format(contract.estimatedRevenue)}
        />
        <ValueBlock
          label="Receita reconhecida"
          value={currencyFormatter.format(contract.recognizedRevenue)}
        />
      </div>

      <ContractCommissionSummaryCard summary={contract.commissionSummary} />

      <div className="mt-4 flex flex-wrap gap-2">
        <OperationsContextLink href="/operations/clients">
          Ver cliente
        </OperationsContextLink>
        <OperationsContextLink href="/operations/administrators">
          Ver administradora
        </OperationsContextLink>
        <OperationsContextLink href="/operations/revenue">
          Ver receita
        </OperationsContextLink>
        <OperationsContextLink href="/operations/portfolio">
          Ver carteira
        </OperationsContextLink>
        {currentContractStatus ? (
          <button
            className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={onChangeStatus}
            type="button"
          >
            Alterar situacao
          </button>
        ) : null}
      </div>

      {contract.attentionItems.length ? (
        <div className="mt-4 rounded-lg border border-amber-100 bg-amber-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-800">
            Pontos de atencao
          </p>
          <ul className="mt-2 grid gap-1.5 text-sm text-amber-900">
            {contract.attentionItems.map((item) => (
              <li key={item}>- {item}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </article>
  );
}

function normalizeContractStatus(value: string | undefined): ContractStatus | null {
  if (
    value === "draft" ||
    value === "pending_documentation" ||
    value === "submitted" ||
    value === "approved" ||
    value === "active" ||
    value === "inactive" ||
    value === "completed" ||
    value === "cancelled" ||
    value === "rejected"
  ) {
    return value;
  }

  return null;
}

function ValueBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-950">{value}</p>
    </div>
  );
}
