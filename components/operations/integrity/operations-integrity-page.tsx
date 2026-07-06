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

export function OperationsIntegrityPage() {
  const [integrityResponse, setIntegrityResponse] =
    useState<MasterDataIntegrityContractsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="grid gap-5">
      <OperationsPageHeader
        eyebrow="Operations Integrity"
        title="Master Data Integrity"
        description="Leitura operacional das inconsistencias de contratos, planos, snapshots, agenda e expected revenue, sem qualquer correcao automatica."
      />
      <OperationsIntegritySummary summary={summary} />
      {contractsWithIssues.length > 0 ? (
        <OperationsIntegrityList contracts={contractsWithIssues} />
      ) : (
        <OperationalEmptyState
          title="Nenhuma inconsistencia encontrada"
          description="Todos os contratos avaliados passaram pelo diagnostico atual sem issues de integridade."
        />
      )}
    </div>
  );
}
