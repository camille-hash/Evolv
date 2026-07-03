"use client";

import { useEffect, useState } from "react";
import { fetchOperationsSummary } from "@/modules/operations/client";
import type { OperationsSummary } from "@/modules/operations/types";
import { OperationalEmptyState } from "./operational-empty-state";
import { OperationsAttentionList } from "./operations-attention-list";
import { OperationsAttentionSummary } from "./operations-attention-summary";

export function OperationsAttentionPage() {
  const [summary, setSummary] = useState<OperationsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadAttentionItems() {
      setIsLoading(true);
      setError(null);

      try {
        const loadedSummary = await fetchOperationsSummary();

        if (isActive) {
          setSummary(loadedSummary);
        }
      } catch (loadError) {
        if (isActive) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Nao foi possivel carregar as pendencias operacionais.",
          );
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadAttentionItems();

    return () => {
      isActive = false;
    };
  }, []);

  if (isLoading) {
    return (
      <OperationalEmptyState
        description="Carregando pendencias operacionais..."
        title="Pendencias"
      />
    );
  }

  if (error) {
    return <OperationalEmptyState description={error} title="Erro operacional" />;
  }

  const attentionItems = summary?.attentionItems ?? [];

  return (
    <div className="grid gap-5">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Operational Attention
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">
          Pendencias
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">
          Centralize pontos operacionais que exigem correcao, validacao ou
          acompanhamento com base nos read models existentes.
        </p>
      </section>

      <OperationsAttentionSummary items={attentionItems} />
      <OperationsAttentionList items={attentionItems} />
    </div>
  );
}
