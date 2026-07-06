"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { fetchOperationsClients } from "@/modules/operations/clients-client";
import type {
  OperationsClientRow,
  OperationsClientsResponse,
  OperationsClientsSummary,
} from "@/modules/operations/clients-types";
import { OperationsContextLink } from "../operations-context-link";
import { OperationalEmptyState } from "../operational-empty-state";
import { OperationsClientsList } from "./operations-clients-list";
import { OperationsClientsSummary as OperationsClientsSummaryCards } from "./operations-clients-summary";

type ClientsPageContext = {
  clientId: string | null;
  origin: string | null;
};

export function OperationsClientsPage() {
  const searchParams = useSearchParams();
  const pageContext = useMemo(
    () => readClientsPageContext(searchParams),
    [searchParams],
  );
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
      } catch (loadError) {
        if (isActive) {
          setError(
            loadError instanceof Error
              ? loadError.message
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

  const allClients = clientsResponse?.clients ?? [];
  const visibleClients = filterClientsByContext(allClients, pageContext);
  const summary = summarizeClients(visibleClients);

  return (
    <div className="grid gap-5">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Clientes operacionais
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">
          Clientes
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">
          Visualize clientes convertidos, contratos associados e a exposicao
          operacional de cada relacionamento.
        </p>
      </section>

      {pageContext.origin === "busca" ? (
        <ClientsContextBanner matchingCount={visibleClients.length} />
      ) : null}

      <OperationsClientsSummaryCards summary={summary} />

      {pageContext.clientId && visibleClients.length === 0 ? (
        <OperationalEmptyState
          description="A Busca Universal apontou para um cliente especifico, mas ele nao apareceu na leitura operacional atual."
          title="Cliente nao encontrado neste contexto"
        />
      ) : (
        <OperationsClientsList clients={visibleClients} />
      )}
    </div>
  );
}

function ClientsContextBanner({
  matchingCount,
}: {
  matchingCount: number;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Contexto da Busca Universal
          </p>
          <h2 className="mt-2 text-lg font-semibold text-slate-950">
            Cliente filtrado por contexto
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            {matchingCount === 1
              ? "Voce ja caiu no cliente certo. Revise o cartao abaixo e siga para o proximo passo operacional."
              : "O cliente apontado pela busca nao apareceu na leitura atual. Vale conferir se ele mudou de organizacao ou perdeu visibilidade operacional."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <OperationsContextLink href="/operations">
            Voltar para a operacao
          </OperationsContextLink>
          <OperationsContextLink href="/operations/clients">
            Ver todos os clientes
          </OperationsContextLink>
        </div>
      </div>
    </section>
  );
}

function readClientsPageContext(
  searchParams: ReturnType<typeof useSearchParams>,
): ClientsPageContext {
  return {
    clientId: searchParams.get("clientId"),
    origin: searchParams.get("origem"),
  };
}

function filterClientsByContext(
  clients: OperationsClientRow[],
  pageContext: ClientsPageContext,
) {
  if (!pageContext.clientId) {
    return clients;
  }

  return clients.filter((client) => client.id === pageContext.clientId);
}

function summarizeClients(clients: OperationsClientRow[]): OperationsClientsSummary {
  return clients.reduce<OperationsClientsSummary>(
    (summary, client) => {
      summary.totalClients += 1;
      summary.totalCreditValue += client.totalCreditValue;
      summary.estimatedRevenue += client.estimatedRevenue;
      summary.recognizedRevenue += client.recognizedRevenue;

      if (client.status === "active") {
        summary.activeClients += 1;
      }

      if (client.attentionItems.length > 0 || client.status === "attention") {
        summary.clientsWithAttention += 1;
      }

      if (client.contractsCount > 0) {
        summary.clientsWithContracts += 1;
      } else {
        summary.clientsWithoutContracts += 1;
      }

      return summary;
    },
    {
      activeClients: 0,
      clientsWithAttention: 0,
      clientsWithContracts: 0,
      clientsWithoutContracts: 0,
      estimatedRevenue: 0,
      recognizedRevenue: 0,
      totalClients: 0,
      totalCreditValue: 0,
    },
  );
}
