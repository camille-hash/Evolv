"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { fetchOperationsRevenue } from "@/modules/operations/revenue-client";
import type { OperationsRevenueResponse } from "@/modules/operations/revenue-types";
import { OperationalEmptyState } from "../operational-empty-state";
import { OperationsRevenueList } from "./operations-revenue-list";
import { OperationsRevenueSummary } from "./operations-revenue-summary";

export function OperationsRevenuePage() {
  const [revenueResponse, setRevenueResponse] =
    useState<OperationsRevenueResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadRevenue() {
      setIsLoading(true);
      setError(null);

      const accessToken = await readSupabaseAccessToken();

      if (!accessToken) {
        if (isActive) {
          setError("Nao foi possivel carregar as receitas operacionais.");
          setIsLoading(false);
        }
        return;
      }

      try {
        const loadedRevenue = await fetchOperationsRevenue(accessToken);

        if (isActive) {
          setRevenueResponse(loadedRevenue);
        }
      } catch {
        if (isActive) {
          setError("Nao foi possivel carregar as receitas operacionais.");
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadRevenue();

    return () => {
      isActive = false;
    };
  }, []);

  if (isLoading) {
    return (
      <OperationalEmptyState
        description="Carregando receitas operacionais..."
        title="Receita"
      />
    );
  }

  if (error) {
    return <OperationalEmptyState description={error} title="Erro operacional" />;
  }

  const summary = revenueResponse?.summary ?? {
    divergentEntries: 0,
    expectedRevenue: 0,
    pendingRevenue: 0,
    recognizedPercentage: 0,
    recognizedRevenue: 0,
    totalEntries: 0,
  };
  const entries = revenueResponse?.entries ?? [];

  return (
    <div className="grid gap-5">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Operations Revenue
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">
          Receita
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">
          Acompanhe receita estimada, reconhecida, divergencias e origem
          contratual.
        </p>
      </section>

      <OperationsRevenueSummary summary={summary} />
      <OperationsRevenueList entries={entries} />
    </div>
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
