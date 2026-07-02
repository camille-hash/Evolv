"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { fetchPortfolioSummary } from "@/modules/portfolio/client";
import type { PortfolioSummaryResponse } from "@/modules/portfolio/types";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  currency: "BRL",
  style: "currency",
});

export function PortfolioSummaryCard() {
  const [portfolio, setPortfolio] = useState<PortfolioSummaryResponse | null>(
    null,
  );
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
          setError("Nao foi possivel carregar o portfolio.");
          setIsLoading(false);
        }
        return;
      }

      try {
        const loadedPortfolio = await fetchPortfolioSummary(accessToken);

        if (isActive) {
          setPortfolio(loadedPortfolio);
        }
      } catch {
        if (isActive) {
          setError("Nao foi possivel carregar o portfolio.");
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
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-sm text-slate-500">Carregando portfolio...</p>
      </section>
    );
  }

  if (error || !portfolio) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-sm text-slate-500">
          {error ?? "Portfolio indisponivel."}
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            Portfolio Intelligence
          </h3>
          <p className="text-xs text-slate-500">
            Carteira derivada de clientes, contratos e receitas.
          </p>
        </div>
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
          Read model
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          label="Clientes"
          value={String(portfolio.summary.clientsCount)}
        />
        <Metric
          label="Contratos"
          value={String(portfolio.summary.contractsCount)}
        />
        <Metric
          label="Credito ativo"
          value={currencyFormatter.format(portfolio.summary.activeCreditAmount)}
        />
        <Metric
          label="Receita prevista"
          value={currencyFormatter.format(
            portfolio.summary.expectedRevenueAmount,
          )}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Administradoras
          </h4>
          <div className="mt-2 space-y-2">
            {portfolio.byAdministrator.slice(0, 5).map((administrator) => (
              <Row
                key={administrator.administratorId ?? "without-administrator"}
                label={administrator.administratorName}
                value={currencyFormatter.format(
                  administrator.totalCreditAmount,
                )}
              />
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Top clientes
          </h4>
          <div className="mt-2 space-y-2">
            {portfolio.topClients.slice(0, 5).map((client) => (
              <Row
                key={client.clientId}
                label={client.clientName}
                value={currencyFormatter.format(client.totalCreditAmount)}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-slate-50 px-3 py-2">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md bg-slate-50 px-3 py-2 text-sm">
      <span className="truncate text-slate-700">{label}</span>
      <span className="shrink-0 font-semibold text-slate-900">{value}</span>
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
