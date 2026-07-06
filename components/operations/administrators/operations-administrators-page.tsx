"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { fetchOperationsAdministrators } from "@/modules/operations/administrators-client";
import type {
  OperationsAdministratorRow,
  OperationsAdministratorsResponse,
  OperationsAdministratorsSummary,
} from "@/modules/operations/administrators-types";
import { OperationsContextLink } from "../operations-context-link";
import { OperationalEmptyState } from "../operational-empty-state";
import { OperationsAdministratorsList } from "./operations-administrators-list";
import { OperationsAdministratorsSummary as OperationsAdministratorsSummaryCards } from "./operations-administrators-summary";
import { OperationsCommissionPlansManager } from "./operations-commission-plans-manager";

type AdministratorsPageContext = {
  administratorId: string | null;
  origin: string | null;
};

export function OperationsAdministratorsPage() {
  const searchParams = useSearchParams();
  const pageContext = useMemo(
    () => readAdministratorsPageContext(searchParams),
    [searchParams],
  );
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
        const loadedAdministrators = await fetchOperationsAdministrators();

        if (isActive) {
          setAdministratorsResponse(loadedAdministrators);
        }
      } catch (loadError) {
        if (isActive) {
          setError(
            loadError instanceof Error
              ? loadError.message
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

  const allAdministrators = administratorsResponse?.administrators ?? [];
  const visibleAdministrators = filterAdministratorsByContext(
    allAdministrators,
    pageContext,
  );
  const summary = summarizeAdministrators(visibleAdministrators);

  return (
    <div className="grid gap-5">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Administradoras operacionais
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">
          Administradoras
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">
          Monitore concentracao operacional, contratos vinculados e a capacidade
          de execucao por administradora.
        </p>
      </section>

      {pageContext.origin === "busca" ? (
        <AdministratorsContextBanner matchingCount={visibleAdministrators.length} />
      ) : null}

      <OperationsAdministratorsSummaryCards summary={summary} />
      <OperationsCommissionPlansManager administrators={visibleAdministrators} />

      {pageContext.administratorId && visibleAdministrators.length === 0 ? (
        <OperationalEmptyState
          description="A Busca Universal apontou para uma administradora especifica, mas ela nao apareceu na leitura operacional atual."
          title="Administradora nao encontrada neste contexto"
        />
      ) : (
        <OperationsAdministratorsList administrators={visibleAdministrators} />
      )}
    </div>
  );
}

function AdministratorsContextBanner({
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
            Administradora filtrada por contexto
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            {matchingCount === 1
              ? "Voce ja caiu na administradora certa. Revise os contratos e planos ligados a ela sem precisar procurar manualmente."
              : "A administradora apontada pela busca nao apareceu na leitura atual. Vale conferir se ela mudou de organizacao ou saiu do contexto operacional."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <OperationsContextLink href="/operations">
            Voltar para a operacao
          </OperationsContextLink>
          <OperationsContextLink href="/operations/administrators">
            Ver todas as administradoras
          </OperationsContextLink>
        </div>
      </div>
    </section>
  );
}

function readAdministratorsPageContext(
  searchParams: ReturnType<typeof useSearchParams>,
): AdministratorsPageContext {
  return {
    administratorId: searchParams.get("administratorId"),
    origin: searchParams.get("origem"),
  };
}

function filterAdministratorsByContext(
  administrators: OperationsAdministratorRow[],
  pageContext: AdministratorsPageContext,
) {
  if (!pageContext.administratorId) {
    return administrators;
  }

  return administrators.filter(
    (administrator) => administrator.id === pageContext.administratorId,
  );
}

function summarizeAdministrators(
  administrators: OperationsAdministratorRow[],
): OperationsAdministratorsSummary {
  return administrators.reduce<OperationsAdministratorsSummary>(
    (summary, administrator) => {
      summary.totalAdministrators += 1;
      summary.totalCreditValue += administrator.totalCreditValue;
      summary.estimatedRevenue += administrator.estimatedRevenue;
      summary.recognizedRevenue += administrator.recognizedRevenue;
      summary.largestExposurePercentage = Math.max(
        summary.largestExposurePercentage,
        administrator.exposurePercentage,
      );

      if (
        administrator.status === "healthy" ||
        administrator.status === "concentrated"
      ) {
        summary.activeAdministrators += 1;
      }

      if (
        administrator.attentionItems.length > 0 ||
        administrator.status === "attention"
      ) {
        summary.administratorsWithAttention += 1;
      }

      if (administrator.contractsCount > 0) {
        summary.administratorsWithContracts += 1;
      } else {
        summary.administratorsWithoutContracts += 1;
      }

      return summary;
    },
    {
      activeAdministrators: 0,
      administratorsWithAttention: 0,
      administratorsWithContracts: 0,
      administratorsWithoutContracts: 0,
      estimatedRevenue: 0,
      largestExposurePercentage: 0,
      recognizedRevenue: 0,
      totalAdministrators: 0,
      totalCreditValue: 0,
    },
  );
}
