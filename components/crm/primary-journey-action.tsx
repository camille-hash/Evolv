"use client";

import { Plus } from "lucide-react";

export function PrimaryJourneyAction({
  onClick,
}: {
  onClick: () => void;
}) {
  return (
    <div className="fixed right-5 top-1/2 z-40 -translate-y-1/2">
      <div className="group relative flex items-center">
        <span
          className="pointer-events-none absolute right-[calc(100%+0.75rem)] hidden whitespace-nowrap rounded-md border bg-popover px-3 py-2 text-xs font-medium text-popover-foreground shadow-sm group-hover:block group-focus-within:block"
          role="tooltip"
        >
          Nova Simulação Comercial
        </span>
        <button
          aria-label="Nova Simulação Comercial"
          className="grid h-14 w-14 place-items-center rounded-full border border-primary/30 bg-primary text-primary-foreground shadow-lg shadow-primary/20 transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          onClick={onClick}
          title="Nova Simulação Comercial"
          type="button"
        >
          <Plus className="h-6 w-6" aria-hidden />
        </button>
      </div>
    </div>
  );
}
