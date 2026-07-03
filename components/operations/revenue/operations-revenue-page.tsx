"use client";

import { useEffect, useState } from "react";
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

      try {
        const loadedRevenue = await fetchOperationsRevenue();

        if (isActive) {
          setRevenueResponse(loadedRevenue);
        }
      } catch (error) {
        if (isActive) {
          setError(
            error instanceof Error
              ? error.message
              : "Nao foi possivel carregar as receitas operacionais.",
          );
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
