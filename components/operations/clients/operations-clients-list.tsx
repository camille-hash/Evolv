import type { OperationsClientRow } from "@/modules/operations/clients-types";
import { OperationsClientCard } from "./operations-client-card";
import { OperationsClientsEmptyState } from "./operations-clients-empty-state";

type OperationsClientsListProps = {
  clients: OperationsClientRow[];
};

export function OperationsClientsList({ clients }: OperationsClientsListProps) {
  if (!clients.length) {
    return <OperationsClientsEmptyState />;
  }

  return (
    <section className="grid gap-4">
      {clients.map((client) => (
        <OperationsClientCard client={client} key={client.id} />
      ))}
    </section>
  );
}
