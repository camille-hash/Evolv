"use client";

import { useEffect, useState } from "react";
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

      try {
        const loadedClients = await fetchOperationsClients();

        if (isActive) {
          setClientsResponse(loadedClients);
        }
      } catch (error) {
        if (isActive) {
          setError(
            error instanceof Error
              ? error.message
              : "Nao foi possivel carregar os clientes operacionais.",
          );
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
