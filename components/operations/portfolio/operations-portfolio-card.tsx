import type { OperationsPortfolioContractRow } from "@/modules/operations/portfolio-types";
import { OperationsContextLink } from "../operations-context-link";

type OperationsPortfolioCardProps = {
  contract: OperationsPortfolioContractRow;
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  currency: "BRL",
  maximumFractionDigits: 0,
  style: "currency",
});

export function OperationsPortfolioCard({
  contract,
}: OperationsPortfolioCardProps) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-slate-950">
            {contract.clientName}
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            {contract.administratorName}
          </p>
          <p className="mt-1 text-xs font-medium text-slate-400">
            {contract.contractNumber
              ? `Contrato ${contract.contractNumber}`
              : "Contrato nao informado"}
          </p>
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

      <div className="mt-4 flex flex-wrap gap-2">
        <OperationsContextLink href="/operations/clients">
          Ver cliente
        </OperationsContextLink>
        <OperationsContextLink href="/operations/contracts">
          Ver contrato
        </OperationsContextLink>
        <OperationsContextLink href="/operations/administrators">
          Ver administradora
        </OperationsContextLink>
        <OperationsContextLink href="/operations/revenue">
          Ver receita
        </OperationsContextLink>
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

function ValueBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-950">{value}</p>
    </div>
  );
}
