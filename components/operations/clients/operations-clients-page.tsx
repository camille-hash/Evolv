"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { fetchOperationsClients } from "@/modules/operations/clients-client";
import type { OperationsClientsResponse } from "@/modules/operations/clients-types";
import { OperationalEmptyState } from "../operational-empty-state";
import { OperationsClientsList } from "./operations-clients-list";
import { OperationsClientsSummary } from "./operations-clients-summary";

export function OperationsClientsPage() {
  const [clientsResponse, setClientsResponse] =
    useState<OperationsClientsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadClients() {
      setIsLoading(true);
      setError(null);

      const accessToken = await readSupabaseAccessToken();

      if (!accessToken) {
        if (isActive) {
          setError("Nao foi possivel carregar os clientes operacionais.");
          setIsLoading(false);
        }
        return;
      }

      try {
        const loadedClients = await fetchOperationsClients(accessToken);

        if (isActive) {
          setClientsResponse(loadedClients);
        }
      } catch {
        if (isActive) {
          setError("Nao foi possivel carregar os clientes operacionais.");
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadClients();

    return () => {
      isActive = false;
    };
  }, []);

  if (isLoading) {
    return (
      <OperationalEmptyState
        description="Carregando clientes operacionais..."
        title="Clientes"
      />
    );
  }

  if (error) {
    return <OperationalEmptyState description={error} title="Erro operacional" />;
  }

  const summary = clientsResponse?.summary ?? {
    activeClients: 0,
    clientsWithAttention: 0,
    clientsWithContracts: 0,
    clientsWithoutContracts: 0,
    estimatedRevenue: 0,
    recognizedRevenue: 0,
    totalClients: 0,
    totalCreditValue: 0,
  };
  const clients = clientsResponse?.clients ?? [];

  return (
    <div className="grid gap-5">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Operations Clients
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">
          Clientes
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">
          Visualize clientes convertidos, contratos associados e composicao
          patrimonial individual.
        </p>
      </section>

      <OperationsClientsSummary summary={summary} />
      <OperationsClientsList clients={clients} />
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
