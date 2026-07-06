"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { fetchOperationsRevenue } from "@/modules/operations/revenue-client";
import type {
  OperationsRevenueResponse,
  OperationsRevenueRow,
  OperationsRevenueSummary,
} from "@/modules/operations/revenue-types";
import { OperationalEmptyState } from "../operational-empty-state";
import { OperationsContextLink } from "../operations-context-link";
import { OperationsRevenueList } from "./operations-revenue-list";
import { OperationsRevenueSummary as OperationsRevenueSummaryCards } from "./operations-revenue-summary";

type RevenuePageContext = {
  contractId: string | null;
  entryId: string | null;
  focus: string | null;
  origin: string | null;
  status: string | null;
};

export function OperationsRevenuePage() {
  const searchParams = useSearchParams();
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

  const pageContext = readRevenuePageContext(searchParams);
  const allEntries = revenueResponse?.entries ?? [];
  const visibleEntries = filterRevenueByContext(allEntries, pageContext);
  const summary = summarizeRevenue(visibleEntries);

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

      {pageContext.origin === "mesa" ? (
        <RevenueContextBanner
          matchingCount={visibleEntries.length}
          pageContext={pageContext}
        />
      ) : null}

      <OperationsRevenueSummaryCards summary={summary} />

      {(pageContext.entryId || pageContext.contractId) && visibleEntries.length === 0 ? (
        <OperationalEmptyState
          title="Receita nao encontrada neste contexto"
          description="A Mesa de Trabalho apontou para uma receita especifica, mas ela nao apareceu na leitura operacional atual."
        />
      ) : (
        <OperationsRevenueList entries={visibleEntries} />
      )}
    </div>
  );
}

function RevenueContextBanner({
  matchingCount,
  pageContext,
}: {
  matchingCount: number;
  pageContext: RevenuePageContext;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Contexto da Mesa de Trabalho
          </p>
          <h2 className="mt-2 text-lg font-semibold text-slate-950">
            {resolveRevenueContextTitle(pageContext)}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            {resolveRevenueContextDescription(pageContext, matchingCount)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <OperationsContextLink href="/operations">
            Voltar para a mesa
          </OperationsContextLink>
          <OperationsContextLink href="/operations/revenue">
            Ver todas as receitas
          </OperationsContextLink>
        </div>
      </div>
    </section>
  );
}

function readRevenuePageContext(
  searchParams: ReturnType<typeof useSearchParams>,
): RevenuePageContext {
  return {
    contractId: searchParams.get("contractId"),
    entryId: searchParams.get("entryId"),
    focus: searchParams.get("foco"),
    origin: searchParams.get("origem"),
    status: searchParams.get("status"),
  };
}

function filterRevenueByContext(
  entries: OperationsRevenueRow[],
  pageContext: RevenuePageContext,
) {
  if (pageContext.entryId) {
    return entries.filter((entry) => entry.id === pageContext.entryId);
  }

  if (pageContext.contractId) {
    return entries.filter((entry) => entry.contractId === pageContext.contractId);
  }

  if (pageContext.status) {
    return entries.filter((entry) => entry.status === pageContext.status);
  }

  return entries;
}

function summarizeRevenue(
  entries: OperationsRevenueRow[],
): OperationsRevenueSummary {
  return entries.reduce<OperationsRevenueSummary>(
    (summary, entry) => {
      summary.totalEntries += 1;
      summary.expectedRevenue += entry.expectedAmount;
      summary.recognizedRevenue += entry.recognizedAmount;

      if (entry.status === "attention") {
        summary.divergentEntries += 1;
      }

      if (entry.status === "expected" || entry.status === "pending") {
        summary.pendingRevenue += entry.expectedAmount;
      }

      return summary;
    },
    {
      divergentEntries: 0,
      expectedRevenue: 0,
      pendingRevenue: 0,
      recognizedPercentage: calculateRecognizedPercentage(entries),
      recognizedRevenue: 0,
      totalEntries: 0,
    },
  );
}

function resolveRevenueContextTitle(pageContext: RevenuePageContext) {
  if (pageContext.focus === "receita_divergente") {
    return "Receita com divergencia operacional";
  }

  if (pageContext.focus === "receita_aguardando") {
    return "Receita aguardando evolucao";
  }

  return "Receitas filtradas por contexto";
}

function resolveRevenueContextDescription(
  pageContext: RevenuePageContext,
  matchingCount: number,
) {
  if (pageContext.entryId && matchingCount === 1) {
    return "Voce ja caiu na receita certa. Revise o cartao abaixo e siga a proxima acao indicada.";
  }

  if ((pageContext.entryId || pageContext.contractId) && matchingCount === 0) {
    return "A receita apontada pela Mesa nao apareceu nesta leitura. Vale conferir se ela foi reconhecida, cancelada ou saiu da visao atual.";
  }

  if (pageContext.contractId) {
    return "A lista foi aberta ja recortada para o contrato relacionado a este trabalho.";
  }

  if (pageContext.status) {
    return `A lista foi aberta ja filtrada pelo status ${pageContext.status}.`;
  }

  return "A lista foi aberta com um recorte especifico para reduzir busca manual.";
}

function calculateRecognizedPercentage(entries: OperationsRevenueRow[]) {
  const expectedTotal = entries.reduce(
    (total, entry) => total + entry.expectedAmount,
    0,
  );
  const recognizedTotal = entries.reduce(
    (total, entry) => total + entry.recognizedAmount,
    0,
  );

  if (expectedTotal <= 0) {
    return 0;
  }

  return Math.round((recognizedTotal / expectedTotal) * 100);
}
