"use client";

import { useEffect, useState } from "react";
import { fetchOperationsSummary } from "@/modules/operations/client";
import type { OperationsSummary } from "@/modules/operations/types";
import { OperationalEmptyState } from "./operational-empty-state";
import { OperationalSnapshotCard } from "./operational-snapshot-card";
import { OperationsAttentionBoard } from "./operations-attention-board";
import { OperationsDrilldownCard } from "./operations-drilldown-card";
import { OperationsHealthScoreCard } from "./health/operations-health-score-card";
import { OperationsIntelligencePanel } from "./intelligence/operations-intelligence-panel";
import { OperationsPriorityBanner } from "./intelligence/operations-priority-banner";
import { OperationsTimelinePanel } from "./timeline/operations-timeline-panel";

export function OperationsOverviewPage() {
  const [summary, setSummary] = useState<OperationsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadOperationsSummary() {
      setIsLoading(true);
      setError(null);

      try {
        const loadedSummary = await fetchOperationsSummary();

        if (isActive) {
          setSummary(loadedSummary);
        }
      } catch (error) {
        if (isActive) {
          setError(
            error instanceof Error
              ? error.message
              : "Nao foi possivel carregar a operacao.",
          );
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadOperationsSummary();

    return () => {
      isActive = false;
    };
  }, []);

  return (
    <>
      {isLoading ? (
        <OperationalEmptyState
          description="Consolidando read models operacionais."
          title="Carregando workspace operacional..."
        />
      ) : null}

      {!isLoading && error ? (
        <OperationalEmptyState description={error} title="Erro operacional" />
      ) : null}

      {!isLoading && !error && summary ? (
        <div className="grid gap-5">
          <OperationsPriorityBanner banner={summary.priorityBanner} />

          <OperationsHealthScoreCard healthScore={summary.healthScore} />

          <OperationalSnapshotCard
            generatedAt={summary.generatedAt}
            healthStatus={summary.healthStatus}
            snapshot={summary.snapshot}
          />

          <OperationsIntelligencePanel insights={summary.insights} />

          <OperationsAttentionBoard items={summary.attentionItems} />

          <OperationsTimelinePanel />

          <section>
            <div className="mb-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Drilldowns
              </p>
              <h2 className="mt-1 text-lg font-semibold text-slate-950">
                Leituras operacionais
              </h2>
            </div>
            {summary.drilldowns.length ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {summary.drilldowns.map((card) => (
                  <OperationsDrilldownCard card={card} key={card.id} />
                ))}
              </div>
            ) : (
              <OperationalEmptyState
                description="Nenhum drilldown operacional disponivel."
                title="Sem dados consolidados"
              />
            )}
          </section>
        </div>
      ) : null}
    </>
  );
}
