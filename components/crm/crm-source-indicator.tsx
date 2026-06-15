"use client";

import { useEffect, useState } from "react";
import {
  getCrmRepositorySource,
  subscribeCrmRepositorySource,
  type CrmRepositorySource,
} from "@/modules/crm";
import { cn } from "@/lib/utils";

const sourceLabels: Record<CrmRepositorySource, string> = {
  anon: "Anon",
  authenticated: "Authenticated",
  localStorage: "LocalStorage",
  unknown: "Detectando",
};

export function CrmSourceIndicator() {
  const [source, setSource] = useState<CrmRepositorySource>(() =>
    getCrmRepositorySource(),
  );

  useEffect(() => {
    return subscribeCrmRepositorySource(setSource);
  }, []);

  return (
    <div
      className={cn(
        "inline-flex w-fit items-center gap-2 rounded-full border px-2.5 py-1 text-[0.68rem] font-medium uppercase tracking-[0.08em]",
        source === "authenticated"
          ? "border-primary/25 bg-primary/5 text-primary"
          : source === "anon"
            ? "border-brand-gold/35 bg-brand-gold/8 text-muted-foreground"
            : source === "localStorage"
              ? "border-border bg-background/70 text-muted-foreground"
              : "border-border bg-background/50 text-muted-foreground/80",
      )}
      title="Indicador tecnico da fonte atual do CRM"
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          source === "authenticated"
            ? "bg-primary"
            : source === "anon"
              ? "bg-brand-gold"
              : source === "localStorage"
                ? "bg-muted-foreground"
                : "bg-border",
        )}
        aria-hidden
      />
      CRM Source: {sourceLabels[source]}
    </div>
  );
}
