import type { OperationsTimelineItem as OperationsTimelineItemType } from "@/modules/operations/timeline-types";
import { OperationsTimelineEmptyState } from "./operations-timeline-empty-state";
import { OperationsTimelineItem } from "./operations-timeline-item";

type OperationsTimelineListProps = {
  items: OperationsTimelineItemType[];
};

export function OperationsTimelineList({ items }: OperationsTimelineListProps) {
  if (!items.length) {
    return <OperationsTimelineEmptyState />;
  }

  return (
    <div className="grid gap-3">
      {items.map((item) => (
        <OperationsTimelineItem item={item} key={item.id} />
      ))}
    </div>
  );
}
