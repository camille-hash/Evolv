"use client";

import { useEffect, useState } from "react";
import {
  fetchMasterDataIntegrityContracts,
} from "@/modules/master-data-integrity/client";
import type { MasterDataIntegrityContractsResponse } from "@/modules/master-data-integrity/types";
import { OperationalEmptyState } from "../operational-empty-state";
import { OperationsPageHeader } from "../operations-page-header";
import { OperationsIntegrityList } from "./operations-integrity-list";
import { OperationsIntegritySummary } from "./operations-integrity-summary";

type ContractVisibilityFilter = "active" | "all" | "inactive";

export function OperationsIntegrityPage() {
  const [integrityResponse, setIntegrityResponse] =
    useState<MasterDataIntegrityContractsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visibilityFilter, setVisibilityFilter] =
    useState<ContractVisibilityFilter>("all");

  useEffect(() => {
    let isActive = true;

    async function loadIntegrity() {
      setIsLoading(true);
      setError(null);

      try {
        const loadedIntegrity = await fetchMasterDataIntegrityContracts();

        if (isActive) {
          setIntegrityResponse(loadedIntegrity);
        }
      } catch (error) {
        if (isActive) {
          setError(
            error instanceof Error
              ? error.message
              : "Nao foi possivel carregar a integridade operacional.",
          );
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadIntegrity();

    return () => {
      isActive = false;
    };
  }, []);

  if (isLoading) {
    return (
      <OperationalEmptyState
        description="Carregando diagnostico de integridade operacional..."
        title="Integrity"
      />
    );
  }

  if (error) {
    return <OperationalEmptyState description={error} title="Erro operacional" />;
  }

  const summary = integrityResponse?.summary ?? {
    contractsWithIssues: 0,
    errors: 0,
    scannedAt: new Date(0).toISOString(),
    totalContracts: 0,
    totalIssues: 0,
    warnings: 0,
  };
  const contractsWithIssues =
    integrityResponse?.contracts.filter((contract) => contract.issues.length > 0) ?? [];
  const visibleContracts = filterContractsByVisibility(
    contractsWithIssues,
    visibilityFilter,
  );

  return (
    <div className="grid gap-5">
      <OperationsPageHeader
        eyebrow="Operations Integrity"
        title="Master Data Integrity"
        description="Leitura operacional das inconsistencias de contratos, planos, snapshots, agenda e expected revenue, sem qualquer correcao automatica."
      />
      <StatusVisibilityFilter
        currentValue={visibilityFilter}
        onChange={setVisibilityFilter}
        title="Filtrar integridade por situacao"
      />
      <OperationsIntegritySummary summary={summary} />
      {visibleContracts.length > 0 ? (
        <OperationsIntegrityList contracts={visibleContracts} />
      ) : (
        <OperationalEmptyState
          title="Nenhuma inconsistencia encontrada nesta situacao"
          description="Nenhum contrato deste recorte possui issues de integridade na leitura operacional atual."
        />
      )}
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
  contracts: MasterDataIntegrityContractsResponse["contracts"],
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
