"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
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

      const accessToken = await readSupabaseAccessToken();

      if (!accessToken) {
        if (isActive) {
          setError("Nao foi possivel carregar a timeline operacional.");
          setIsLoading(false);
        }
        return;
      }

      try {
        const loadedTimeline = await fetchOperationsTimeline(accessToken);

        if (isActive) {
          setTimeline(loadedTimeline);
        }
      } catch {
        if (isActive) {
          setError("Nao foi possivel carregar a timeline operacional.");
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
          Timeline operacional
        </p>
        <h2 className="mt-1 text-lg font-semibold text-slate-950">
          Movimentos recentes da operacao
        </h2>
      </div>

      <div className="mt-4">
        {isLoading ? (
          <OperationalEmptyState
            description="Carregando timeline operacional..."
            title="Linha do tempo"
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
