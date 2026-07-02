"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { fetchOperationsContracts } from "@/modules/operations/contracts-client";
import type { OperationsContractsResponse } from "@/modules/operations/contracts-types";
import { OperationalEmptyState } from "../operational-empty-state";
import { OperationsContractsList } from "./operations-contracts-list";
import { OperationsContractsSummary } from "./operations-contracts-summary";

export function OperationsContractsPage() {
  const [contractsResponse, setContractsResponse] =
    useState<OperationsContractsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadContracts() {
      setIsLoading(true);
      setError(null);

      const accessToken = await readSupabaseAccessToken();

      if (!accessToken) {
        if (isActive) {
          setError("Nao foi possivel carregar os contratos operacionais.");
          setIsLoading(false);
        }
        return;
      }

      try {
        const loadedContracts = await fetchOperationsContracts(accessToken);

        if (isActive) {
          setContractsResponse(loadedContracts);
        }
      } catch {
        if (isActive) {
          setError("Nao foi possivel carregar os contratos operacionais.");
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadContracts();

    return () => {
      isActive = false;
    };
  }, []);

  if (isLoading) {
    return (
      <OperationalEmptyState
        description="Carregando contratos operacionais..."
        title="Contratos"
      />
    );
  }

  if (error) {
    return <OperationalEmptyState description={error} title="Erro operacional" />;
  }

  const summary = contractsResponse?.summary ?? {
    activeContracts: 0,
    attentionContracts: 0,
    estimatedRevenue: 0,
    recognizedRevenue: 0,
    totalContracts: 0,
    totalCreditValue: 0,
  };
  const contracts = contractsResponse?.contracts ?? [];

  return (
    <div className="grid gap-5">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Operations Contracts
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">
          Contratos
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">
          Acompanhe contratos ativos, pendencias documentais, administradoras
          vinculadas e origem de receita.
        </p>
      </section>

      <OperationsContractsSummary summary={summary} />
      <OperationsContractsList contracts={contracts} />
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
