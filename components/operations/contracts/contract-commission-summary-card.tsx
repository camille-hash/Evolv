import type { ContractCommissionSummary } from "@/modules/commission-engine/types";

type ContractCommissionSummaryCardProps = {
  summary?: ContractCommissionSummary;
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  currency: "BRL",
  maximumFractionDigits: 0,
  style: "currency",
});

export function ContractCommissionSummaryCard({
  summary,
}: ContractCommissionSummaryCardProps) {
  if (!summary?.hasCommissionEngine || !summary.snapshot) {
    return (
      <div className="mt-4 border-t border-slate-100 pt-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
          Comissao
        </p>
        <p className="mt-2 text-sm text-slate-500">
          Este contrato ainda nao possui snapshot de comissao.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 border-t border-slate-100 pt-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Comissao
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-950">
            {summary.snapshot.sourceCommissionPlanName ?? "Plano sem nome"}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Snapshot {summary.snapshot.lifecycle} -{" "}
            {summary.snapshot.businessStatus}
          </p>
        </div>
        <div className="text-right text-xs text-slate-500">
          {summary.snapshot.frozenAt ? (
            <span>Congelado em {formatDate(summary.snapshot.frozenAt)}</span>
          ) : (
            <span>Snapshot em aberto</span>
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <SummaryValue
          label="Prevista"
          value={currencyFormatter.format(summary.totals.expectedAmount)}
        />
        <SummaryValue
          label="Reconhecida"
          value={currencyFormatter.format(summary.totals.recognizedAmount)}
        />
        <SummaryValue
          label="Saldo"
          value={currencyFormatter.format(summary.totals.remainingAmount)}
        />
      </div>

      <div className="mt-3 grid gap-2 text-xs text-slate-500 sm:grid-cols-2">
        <p>
          Agenda: {summary.schedule.pending} pendente(s),{" "}
          {summary.schedule.executed} executada(s),{" "}
          {summary.schedule.cancelled} cancelada(s)
        </p>
        <p>
          Receita: {summary.expectedRevenue.pending} aguardando,{" "}
          {summary.expectedRevenue.partiallyRecognized} parcial(is),{" "}
          {summary.expectedRevenue.recognized} reconhecida(s)
        </p>
      </div>
    </div>
  );
}

function SummaryValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-50 px-3 py-2">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
  }).format(new Date(value));
}
