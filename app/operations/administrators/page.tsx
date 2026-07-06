import { Suspense } from "react";
import { OperationsAdministratorsPage as OperationsAdministratorsDrilldownPage } from "@/components/operations/administrators/operations-administrators-page";
import { OperationalEmptyState } from "@/components/operations/operational-empty-state";

export default function OperationsAdministratorsPage() {
  return (
    <Suspense
      fallback={
        <OperationalEmptyState
          title="Administradoras"
          description="Carregando administradoras operacionais..."
        />
      }
    >
      <OperationsAdministratorsDrilldownPage />
    </Suspense>
  );
}
