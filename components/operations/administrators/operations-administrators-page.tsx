"use client";

import { useEffect, useState } from "react";
import { fetchOperationsAdministrators } from "@/modules/operations/administrators-client";
import type { OperationsAdministratorsResponse } from "@/modules/operations/administrators-types";
import { OperationalEmptyState } from "../operational-empty-state";
import { OperationsAdministratorsList } from "./operations-administrators-list";
import { OperationsAdministratorsSummary } from "./operations-administrators-summary";
import { OperationsCommissionPlansManager } from "./operations-commission-plans-manager";

export function OperationsAdministratorsPage() {
  const [administratorsResponse, setAdministratorsResponse] =
    useState<OperationsAdministratorsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadAdministrators() {
      setIsLoading(true);
      setError(null);

      try {
        const loadedAdministrators =
          await fetchOperationsAdministrators();

        if (isActive) {
          setAdministratorsResponse(loadedAdministrators);
        }
      } catch (error) {
        if (isActive) {
          setError(
            error instanceof Error
              ? error.message
              : "Nao foi possivel carregar as administradoras operacionais.",
          );
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadAdministrators();

    return () => {
      isActive = false;
    };
  }, []);

  if (isLoading) {
    return (
      <OperationalEmptyState
        description="Carregando administradoras operacionais..."
        title="Administradoras"
      />
    );
  }

  if (error) {
    return <OperationalEmptyState description={error} title="Erro operacional" />;
  }

  const summary = administratorsResponse?.summary ?? {
    activeAdministrators: 0,
    administratorsWithAttention: 0,
    administratorsWithContracts: 0,
    administratorsWithoutContracts: 0,
    estimatedRevenue: 0,
    largestExposurePercentage: 0,
    recognizedRevenue: 0,
    totalAdministrators: 0,
    totalCreditValue: 0,
  };
  const administrators = administratorsResponse?.administrators ?? [];

  return (
    <div className="grid gap-5">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Operations Administrators
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">
          Administradoras
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">
          Monitore concentracao operacional, contratos vinculados e performance
          por administradora.
        </p>
      </section>

      <OperationsAdministratorsSummary summary={summary} />
      <OperationsCommissionPlansManager administrators={administrators} />
      <OperationsAdministratorsList administrators={administrators} />
    </div>
  );
}
