import { Suspense } from "react";
import { OperationsClientsPage as OperationsClientsDrilldownPage } from "@/components/operations/clients/operations-clients-page";
import { OperationalEmptyState } from "@/components/operations/operational-empty-state";

export default function OperationsClientsPage() {
  return (
    <Suspense
      fallback={
        <OperationalEmptyState
          title="Clientes"
          description="Carregando clientes operacionais..."
        />
      }
    >
      <OperationsClientsDrilldownPage />
    </Suspense>
  );
}
