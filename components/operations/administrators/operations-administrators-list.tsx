import type { OperationsAdministratorRow } from "@/modules/operations/administrators-types";
import { OperationsAdministratorCard } from "./operations-administrator-card";
import { OperationsAdministratorsEmptyState } from "./operations-administrators-empty-state";

type OperationsAdministratorsListProps = {
  administrators: OperationsAdministratorRow[];
};

export function OperationsAdministratorsList({
  administrators,
}: OperationsAdministratorsListProps) {
  if (!administrators.length) {
    return <OperationsAdministratorsEmptyState />;
  }

  return (
    <section className="grid gap-4">
      {administrators.map((administrator) => (
        <OperationsAdministratorCard
          administrator={administrator}
          key={administrator.id}
        />
      ))}
    </section>
  );
}
