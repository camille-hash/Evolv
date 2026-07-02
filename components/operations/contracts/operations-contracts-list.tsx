import type { OperationsContractRow } from "@/modules/operations/contracts-types";
import { OperationsContractCard } from "./operations-contract-card";
import { OperationsContractsEmptyState } from "./operations-contracts-empty-state";

type OperationsContractsListProps = {
  contracts: OperationsContractRow[];
};

export function OperationsContractsList({
  contracts,
}: OperationsContractsListProps) {
  if (!contracts.length) {
    return <OperationsContractsEmptyState />;
  }

  return (
    <section className="grid gap-4">
      {contracts.map((contract) => (
        <OperationsContractCard contract={contract} key={contract.id} />
      ))}
    </section>
  );
}
