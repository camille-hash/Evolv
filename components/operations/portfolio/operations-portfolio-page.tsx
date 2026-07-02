"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { fetchOperationsPortfolio } from "@/modules/operations/portfolio-client";
import type { OperationsPortfolioResponse } from "@/modules/operations/portfolio-types";
import { OperationalEmptyState } from "../operational-empty-state";
import { OperationsPortfolioDistribution } from "./operations-portfolio-distribution";
import { OperationsPortfolioList } from "./operations-portfolio-list";
import { OperationsPortfolioSummary } from "./operations-portfolio-summary";

export function OperationsPortfolioPage() {
  const [portfolioResponse, setPortfolioResponse] =
    useState<OperationsPortfolioResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadPortfolio() {
      setIsLoading(true);
      setError(null);

      const accessToken = await readSupabaseAccessToken();

      if (!accessToken) {
        if (isActive) {
          setError("Nao foi possivel carregar a carteira operacional.");
          setIsLoading(false);
        }
        return;
      }

      try {
        const loadedPortfolio = await fetchOperationsPortfolio(accessToken);

        if (isActive) {
          setPortfolioResponse(loadedPortfolio);
        }
      } catch {
        if (isActive) {
          setError("Nao foi possivel carregar a carteira operacional.");
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadPortfolio();

    return () => {
      isActive = false;
    };
  }, []);

  if (isLoading) {
    return (
      <OperationalEmptyState
        description="Carregando carteira operacional..."
        title="Carteira"
      />
    );
  }

  if (error) {
    return <OperationalEmptyState description={error} title="Erro operacional" />;
  }

  const summary = portfolioResponse?.summary ?? {
    attentionItems: [],
    estimatedRevenue: 0,
    largestAdministratorExposurePercentage: 0,
    largestClientExposurePercentage: 0,
    recognizedRevenue: 0,
    totalAdministrators: 0,
    totalClients: 0,
    totalContracts: 0,
    totalPortfolioValue: 0,
  };
  const clientExposures = portfolioResponse?.clientExposures ?? [];
  const administratorExposures = portfolioResponse?.administratorExposures ?? [];
  const contracts = portfolioResponse?.contracts ?? [];

  return (
    <div className="grid gap-5">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Operations Portfolio
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">
          Carteira
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">
          Consolide valor em carteira, composicao por cliente, administradora e
          contrato.
        </p>
      </section>

      <OperationsPortfolioSummary summary={summary} />

      {summary.attentionItems.length ? (
        <section className="rounded-xl border border-amber-100 bg-amber-50 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-800">
            Pontos de atencao da carteira
          </p>
          <ul className="mt-3 grid gap-1.5 text-sm text-amber-900">
            {summary.attentionItems.map((item) => (
              <li key={item}>- {item}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <OperationsPortfolioDistribution
        administratorExposures={administratorExposures}
        clientExposures={clientExposures}
      />

      <OperationsPortfolioList contracts={contracts} />
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
