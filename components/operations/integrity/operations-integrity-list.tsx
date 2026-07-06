import type { MasterDataIntegrityContractRecord } from "@/modules/master-data-integrity/types";
import { OperationsIntegrityContractCard } from "./operations-integrity-contract-card";

type OperationsIntegrityListProps = {
  contracts: MasterDataIntegrityContractRecord[];
};

export function OperationsIntegrityList({
  contracts,
}: OperationsIntegrityListProps) {
  const sortedContracts = [...contracts].sort((left, right) => {
    const leftErrors = left.issues.filter((issue) => issue.severity === "error").length;
    const rightErrors = right.issues.filter(
      (issue) => issue.severity === "error",
    ).length;

    if (leftErrors !== rightErrors) {
      return rightErrors - leftErrors;
    }

    const leftWarnings = left.issues.length - leftErrors;
    const rightWarnings = right.issues.length - rightErrors;

    if (leftWarnings !== rightWarnings) {
      return rightWarnings - leftWarnings;
    }

    return String(left.contractNumber ?? "").localeCompare(
      String(right.contractNumber ?? ""),
      "pt-BR",
      { numeric: true },
    );
  });

  return (
    <section className="grid gap-4">
      {sortedContracts.map((contract) => (
        <OperationsIntegrityContractCard
          contract={contract}
          key={contract.contractId}
        />
      ))}
    </section>
  );
}
