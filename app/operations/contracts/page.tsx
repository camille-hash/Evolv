import { Suspense } from "react";
import { OperationsContractsPage as OperationsContractsView } from "@/components/operations/contracts/operations-contracts-page";
import { OperationalEmptyState } from "@/components/operations/operational-empty-state";

export default function OperationsContractsPage() {
  return (
    <Suspense
      fallback={
        <OperationalEmptyState
          title="Contratos"
          description="Carregando contratos operacionais..."
        />
      }
    >
      <OperationsContractsView />
    </Suspense>
  );
}
