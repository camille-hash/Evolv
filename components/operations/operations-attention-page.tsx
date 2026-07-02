"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
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

      const accessToken = await readSupabaseAccessToken();

      if (!accessToken) {
        if (isActive) {
          setError("Não foi possível carregar as pendências operacionais.");
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
          setError("Não foi possível carregar as pendências operacionais.");
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
        description="Carregando pendências operacionais..."
        title="Pendências"
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
          Pendências
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">
          Centralize pontos operacionais que exigem correção, validação ou
          acompanhamento com base nos read models existentes.
        </p>
      </section>

      <OperationsAttentionSummary items={attentionItems} />
      <OperationsAttentionList items={attentionItems} />
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
