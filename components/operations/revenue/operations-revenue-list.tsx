import type { OperationsRevenueRow } from "@/modules/operations/revenue-types";
import { OperationsRevenueCard } from "./operations-revenue-card";
import { OperationsRevenueEmptyState } from "./operations-revenue-empty-state";

type OperationsRevenueListProps = {
  entries: OperationsRevenueRow[];
};

export function OperationsRevenueList({ entries }: OperationsRevenueListProps) {
  if (!entries.length) {
    return <OperationsRevenueEmptyState />;
  }

  return (
    <section className="grid gap-4">
      {entries.map((entry) => (
        <OperationsRevenueCard entry={entry} key={entry.id} />
      ))}
    </section>
  );
}
