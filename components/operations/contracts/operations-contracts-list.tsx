import type { OperationsContractRow } from "@/modules/operations/contracts-types";
import { OperationsContractCard } from "./operations-contract-card";
import { OperationsContractsEmptyState } from "./operations-contracts-empty-state";

type OperationsContractsListProps = {
  contracts: OperationsContractRow[];
  highlightedContractId?: string | null;
  onChangeStatus?: (contract: OperationsContractRow) => void;
  onResolveMissingContractNumber?: (contract: OperationsContractRow) => void;
};

export function OperationsContractsList({
  contracts,
  highlightedContractId,
  onChangeStatus,
  onResolveMissingContractNumber,
}: OperationsContractsListProps) {
  if (!contracts.length) {
    return <OperationsContractsEmptyState />;
  }

  return (
    <section className="grid gap-4">
      {contracts.map((contract) => (
        <OperationsContractCard
          contract={contract}
          isHighlighted={highlightedContractId === contract.id}
          key={contract.id}
          onChangeStatus={
            onChangeStatus ? () => onChangeStatus(contract) : undefined
          }
          onResolveMissingContractNumber={
            onResolveMissingContractNumber
              ? () => onResolveMissingContractNumber(contract)
              : undefined
          }
        />
      ))}
    </section>
  );
}
