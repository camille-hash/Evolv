"use client";

import { useEffect, useState } from "react";
import { fetchOperationsTimeline } from "@/modules/operations/timeline-client";
import type { OperationsTimelineResponse } from "@/modules/operations/timeline-types";
import { OperationalEmptyState } from "../operational-empty-state";
import { OperationsTimelineList } from "./operations-timeline-list";

export function OperationsTimelinePanel() {
  const [timeline, setTimeline] = useState<OperationsTimelineResponse | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadTimeline() {
      setIsLoading(true);
      setError(null);

      try {
        const loadedTimeline = await fetchOperationsTimeline();

        if (isActive) {
          setTimeline(loadedTimeline);
        }
      } catch (error) {
        if (isActive) {
          setError(
            error instanceof Error
              ? error.message
              : "Nao foi possivel carregar a atividade operacional.",
          );
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadTimeline();

    return () => {
      isActive = false;
    };
  }, []);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Atividade
        </p>
        <h2 className="mt-1 text-lg font-semibold text-slate-950">
          Atividade operacional recente
        </h2>
      </div>

      <div className="mt-4">
        {isLoading ? (
          <OperationalEmptyState
            description="Carregando atividade operacional..."
            title="Atividade"
          />
        ) : null}

        {!isLoading && error ? (
          <OperationalEmptyState description={error} title="Erro operacional" />
        ) : null}

        {!isLoading && !error ? (
          <OperationsTimelineList items={timeline?.items ?? []} />
        ) : null}
      </div>
    </section>
  );
}
