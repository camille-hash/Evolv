import { Suspense } from "react";
import { OperationalEmptyState } from "@/components/operations/operational-empty-state";
import { OperationsRevenuePage as OperationsRevenueDrilldownPage } from "@/components/operations/revenue/operations-revenue-page";

export default function OperationsRevenuePage() {
  return (
    <Suspense
      fallback={
        <OperationalEmptyState
          title="Receita"
          description="Carregando receitas operacionais..."
        />
      }
    >
      <OperationsRevenueDrilldownPage />
    </Suspense>
  );
}
