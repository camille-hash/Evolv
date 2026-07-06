"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { fetchOperationsContracts } from "@/modules/operations/contracts-client";
import type {
  OperationsContractsResponse,
  OperationsContractsSummary,
  OperationsContractRow,
} from "@/modules/operations/contracts-types";
import { OperationalEmptyState } from "../operational-empty-state";
import { OperationsContextLink } from "../operations-context-link";
import { OperationsContractsList } from "./operations-contracts-list";
import { OperationsContractsSummary as OperationsContractsSummaryCards } from "./operations-contracts-summary";

type ContractsPageContext = {
  contractId: string | null;
  focus: string | null;
  origin: string | null;
  status: string | null;
};

export function OperationsContractsPage() {
  const searchParams = useSearchParams();
  const [contractsResponse, setContractsResponse] =
    useState<OperationsContractsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadContracts() {
      setIsLoading(true);
      setError(null);

      try {
        const loadedContracts = await fetchOperationsContracts();

        if (isActive) {
          setContractsResponse(loadedContracts);
        }
      } catch (error) {
        if (isActive) {
          setError(
            error instanceof Error
              ? error.message
              : "Nao foi possivel carregar os contratos operacionais.",
          );
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

  const pageContext = readContractsPageContext(searchParams);
  const allContracts = contractsResponse?.contracts ?? [];
  const visibleContracts = filterContractsByContext(allContracts, pageContext);
  const summary = summarizeContracts(visibleContracts);

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

      {pageContext.origin === "mesa" ? (
        <ContractsContextBanner
          matchingCount={visibleContracts.length}
          pageContext={pageContext}
        />
      ) : null}

      <OperationsContractsSummaryCards summary={summary} />

      {pageContext.contractId && visibleContracts.length === 0 ? (
        <OperationalEmptyState
          title="Contrato nao encontrado neste contexto"
          description="A Mesa de Trabalho apontou para um contrato especifico, mas ele nao apareceu na leitura operacional atual."
        />
      ) : (
        <OperationsContractsList contracts={visibleContracts} />
      )}
    </div>
  );
}

function ContractsContextBanner({
  matchingCount,
  pageContext,
}: {
  matchingCount: number;
  pageContext: ContractsPageContext;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Contexto da Mesa de Trabalho
          </p>
          <h2 className="mt-2 text-lg font-semibold text-slate-950">
            {resolveContractsContextTitle(pageContext)}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            {resolveContractsContextDescription(pageContext, matchingCount)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <OperationsContextLink href="/operations">
            Voltar para a mesa
          </OperationsContextLink>
          <OperationsContextLink href="/operations/contracts">
            Ver todos os contratos
          </OperationsContextLink>
        </div>
      </div>
    </section>
  );
}

function readContractsPageContext(
  searchParams: ReturnType<typeof useSearchParams>,
): ContractsPageContext {
  return {
    contractId: searchParams.get("contractId"),
    focus: searchParams.get("foco"),
    origin: searchParams.get("origem"),
    status: searchParams.get("status"),
  };
}

function filterContractsByContext(
  contracts: OperationsContractRow[],
  pageContext: ContractsPageContext,
) {
  if (pageContext.contractId) {
    return contracts.filter((contract) => contract.id === pageContext.contractId);
  }

  if (pageContext.status) {
    return contracts.filter(
      (contract) => normalizeText(contract.sourceStatus) === pageContext.status,
    );
  }

  return contracts;
}

function summarizeContracts(
  contracts: OperationsContractRow[],
): OperationsContractsSummary {
  return contracts.reduce<OperationsContractsSummary>(
    (summary, contract) => {
      summary.totalContracts += 1;
      summary.totalCreditValue += contract.creditValue;
      summary.estimatedRevenue += contract.estimatedRevenue;
      summary.recognizedRevenue += contract.recognizedRevenue;

      if (contract.status === "active") {
        summary.activeContracts += 1;
      }

      if (contract.attentionItems.length > 0 || contract.status === "attention") {
        summary.attentionContracts += 1;
      }

      return summary;
    },
    {
      activeContracts: 0,
      attentionContracts: 0,
      estimatedRevenue: 0,
      recognizedRevenue: 0,
      totalContracts: 0,
      totalCreditValue: 0,
    },
  );
}

function resolveContractsContextTitle(pageContext: ContractsPageContext) {
  if (pageContext.focus === "pendencia_contrato") {
    return "Contrato com pendencia operacional";
  }

  if (pageContext.focus === "aguardando_contrato") {
    return "Contrato aguardando retorno";
  }

  return "Contratos filtrados por contexto";
}

function resolveContractsContextDescription(
  pageContext: ContractsPageContext,
  matchingCount: number,
) {
  if (pageContext.contractId && matchingCount === 1) {
    return "Voce ja caiu no contrato certo. Revise o cartao abaixo e siga a proxima acao indicada.";
  }

  if (pageContext.contractId && matchingCount === 0) {
    return "O contrato apontado pela Mesa nao apareceu nesta leitura. Vale conferir se ele mudou de status ou saiu da visao operacional atual.";
  }

  if (pageContext.status) {
    return `A lista foi aberta ja filtrada pelo status operacional ${pageContext.status}.`;
  }

  return "A lista foi aberta com um recorte especifico para reduzir busca manual.";
}

function normalizeText(value: string | undefined | null) {
  return value?.trim().toLowerCase() ?? "";
}
