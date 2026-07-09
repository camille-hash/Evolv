"use client";

import { useEffect, useState } from "react";
import { fetchOperationsPortfolio } from "@/modules/operations/portfolio-client";
import type {
  OperationsPortfolioContractRow,
  OperationsPortfolioExposureRow,
  OperationsPortfolioExposureType,
  OperationsPortfolioResponse,
  OperationsPortfolioStatus,
} from "@/modules/operations/portfolio-types";
import { OperationalEmptyState } from "../operational-empty-state";
import { OperationsPortfolioDistribution } from "./operations-portfolio-distribution";
import { OperationsPortfolioList } from "./operations-portfolio-list";
import { OperationsPortfolioSummary } from "./operations-portfolio-summary";

type ContractVisibilityFilter = "active" | "all" | "inactive";

const clientExposureThreshold = 50;
const administratorExposureThreshold = 60;

export function OperationsPortfolioPage() {
  const [portfolioResponse, setPortfolioResponse] =
    useState<OperationsPortfolioResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visibilityFilter, setVisibilityFilter] =
    useState<ContractVisibilityFilter>("all");

  useEffect(() => {
    let isActive = true;

    async function loadPortfolio() {
      setIsLoading(true);
      setError(null);

      try {
        const loadedPortfolio = await fetchOperationsPortfolio();

        if (isActive) {
          setPortfolioResponse(loadedPortfolio);
        }
      } catch (error) {
        if (isActive) {
          setError(
            error instanceof Error
              ? error.message
              : "Nao foi possivel carregar a carteira operacional.",
          );
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
    activeCreditValue: 0,
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
  const contracts = portfolioResponse?.contracts ?? [];
  const visibleContracts = filterContractsByVisibility(
    contracts,
    visibilityFilter,
  );
  const clientExposures = buildExposureRows(visibleContracts, "client");
  const administratorExposures = buildExposureRows(
    visibleContracts,
    "administrator",
  );

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

      <StatusVisibilityFilter
        currentValue={visibilityFilter}
        onChange={setVisibilityFilter}
        title="Filtrar carteira por situacao"
      />

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

      <OperationsPortfolioList contracts={visibleContracts} />
    </div>
  );
}

function StatusVisibilityFilter({
  currentValue,
  onChange,
  title,
}: {
  currentValue: ContractVisibilityFilter;
  onChange: (value: ContractVisibilityFilter) => void;
  title: string;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm font-medium text-slate-700">{title}</p>
        <div className="flex flex-wrap gap-2">
          {[
            { label: "Todos", value: "all" },
            { label: "Ativos", value: "active" },
            { label: "Inativos", value: "inactive" },
          ].map((option) => {
            const isActive = currentValue === option.value;

            return (
              <button
                className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                  isActive
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
                }`}
                key={option.value}
                onClick={() =>
                  onChange(option.value as ContractVisibilityFilter)
                }
                type="button"
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function filterContractsByVisibility(
  contracts: OperationsPortfolioContractRow[],
  visibilityFilter: ContractVisibilityFilter,
) {
  if (visibilityFilter === "active") {
    return contracts.filter((contract) => contract.status === "active");
  }

  if (visibilityFilter === "inactive") {
    return contracts.filter((contract) => contract.status === "inactive");
  }

  return contracts;
}

function buildExposureRows(
  contracts: OperationsPortfolioContractRow[],
  type: OperationsPortfolioExposureType,
): OperationsPortfolioExposureRow[] {
  const totalCreditValue = roundCurrency(
    contracts.reduce((total, contract) => total + contract.creditValue, 0),
  );
  const groups = new Map<
    string,
    {
      attentionItems: Set<string>;
      contractsCount: number;
      estimatedRevenue: number;
      label: string;
      recognizedRevenue: number;
      totalCreditValue: number;
    }
  >();

  for (const contract of contracts) {
    const label =
      type === "client" ? contract.clientName : contract.administratorName;
    const group =
      groups.get(label) ??
      ({
        attentionItems: new Set<string>(),
        contractsCount: 0,
        estimatedRevenue: 0,
        label,
        recognizedRevenue: 0,
        totalCreditValue: 0,
      } satisfies {
        attentionItems: Set<string>;
        contractsCount: number;
        estimatedRevenue: number;
        label: string;
        recognizedRevenue: number;
        totalCreditValue: number;
      });

    group.contractsCount += 1;
    group.totalCreditValue = roundCurrency(
      group.totalCreditValue + contract.creditValue,
    );
    group.estimatedRevenue = roundCurrency(
      group.estimatedRevenue + contract.estimatedRevenue,
    );
    group.recognizedRevenue = roundCurrency(
      group.recognizedRevenue + contract.recognizedRevenue,
    );

    for (const item of contract.attentionItems) {
      group.attentionItems.add(item);
    }

    groups.set(label, group);
  }

  return Array.from(groups.entries())
    .map(([label, group]) => {
      const threshold =
        type === "client"
          ? clientExposureThreshold
          : administratorExposureThreshold;
      const exposurePercentage =
        totalCreditValue > 0
          ? roundPercentage((group.totalCreditValue / totalCreditValue) * 100)
          : 0;
      const attentionItems = new Set(group.attentionItems);

      if (totalCreditValue === 0) {
        attentionItems.add("total portfolio value equals zero");
      }

      if (exposurePercentage > threshold) {
        attentionItems.add(
          type === "client"
            ? "largest client exposure above 50%"
            : "largest administrator exposure above 60%",
        );
      }

      return {
        attentionItems: Array.from(attentionItems),
        contractsCount: group.contractsCount,
        estimatedRevenue: group.estimatedRevenue,
        exposurePercentage,
        id: `${type}:${label}`,
        label,
        recognizedRevenue: group.recognizedRevenue,
        status: resolveExposureStatus(
          attentionItems.size,
          exposurePercentage,
          threshold,
          totalCreditValue,
        ),
        totalCreditValue: group.totalCreditValue,
        type,
      };
    })
    .sort((left, right) => right.totalCreditValue - left.totalCreditValue);
}

function resolveExposureStatus(
  attentionItemsCount: number,
  exposurePercentage: number,
  threshold: number,
  totalCreditValue: number,
): OperationsPortfolioStatus {
  if (totalCreditValue === 0) {
    return "empty";
  }

  if (exposurePercentage > threshold) {
    return "concentrated";
  }

  if (attentionItemsCount > 0) {
    return "attention";
  }

  return "healthy";
}

function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function roundPercentage(value: number) {
  return Math.round((value + Number.EPSILON) * 10) / 10;
}
