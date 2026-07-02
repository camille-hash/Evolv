"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
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

      const accessToken = await readSupabaseAccessToken();

      if (!accessToken) {
        if (isActive) {
          setError("Sessao invalida para carregar a operacao.");
          setIsLoading(false);
        }
        return;
      }

      try {
        const loadedSummary = await fetchOperationsSummary(accessToken);

        if (isActive) {
          setSummary(loadedSummary);
        }
      } catch {
        if (isActive) {
          setError("Nao foi possivel carregar a operacao.");
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

async function readSupabaseAccessToken() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !publishableKey) {
    return null;
  }

  const supabase = createClient(supabaseUrl, publishableKey, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: true,
      persistSession: true,
    },
  });
  const { data, error } = await supabase.auth.getSession();

  if (error || !data.session?.access_token) {
    return null;
  }

  return data.session.access_token;
}
