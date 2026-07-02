import type { OperationsPortfolioContractRow } from "@/modules/operations/portfolio-types";
import { OperationsPortfolioCard } from "./operations-portfolio-card";
import { OperationsPortfolioEmptyState } from "./operations-portfolio-empty-state";

type OperationsPortfolioListProps = {
  contracts: OperationsPortfolioContractRow[];
};

export function OperationsPortfolioList({
  contracts,
}: OperationsPortfolioListProps) {
  if (!contracts.length) {
    return <OperationsPortfolioEmptyState />;
  }

  return (
    <section>
      <div className="mb-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Contratos da carteira
        </p>
        <h2 className="mt-1 text-lg font-semibold text-slate-950">
          Composicao contratual
        </h2>
      </div>
      <div className="grid gap-4">
        {contracts.map((contract) => (
          <OperationsPortfolioCard contract={contract} key={contract.id} />
        ))}
      </div>
    </section>
  );
}
