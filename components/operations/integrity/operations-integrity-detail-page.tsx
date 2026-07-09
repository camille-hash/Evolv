"use client";

import { useEffect, useState } from "react";
import type { MasterDataIntegrityContractRecord } from "@/modules/master-data-integrity/types";
import { fetchMasterDataIntegrityContracts } from "@/modules/master-data-integrity/client";
import { OperationalEmptyState } from "../operational-empty-state";
import { OperationsContextLink } from "../operations-context-link";
import { OperationsPageHeader } from "../operations-page-header";
import { OperationsIntegrityIssueList } from "./operations-integrity-issue-list";

type OperationsIntegrityDetailPageProps = {
  contractId: string;
};

export function OperationsIntegrityDetailPage({
  contractId,
}: OperationsIntegrityDetailPageProps) {
  const [contract, setContract] =
    useState<MasterDataIntegrityContractRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadContract() {
      setIsLoading(true);
      setError(null);

      try {
        const payload = await fetchMasterDataIntegrityContracts();
        const matchedContract =
          payload.contracts.find((item) => item.contractId === contractId) ?? null;

        if (isActive) {
          setContract(matchedContract);
        }
      } catch (error) {
        if (isActive) {
          setError(
            error instanceof Error
              ? error.message
              : "Nao foi possivel carregar o detalhe de integridade.",
          );
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadContract();

    return () => {
      isActive = false;
    };
  }, [contractId]);

  if (isLoading) {
    return (
      <OperationalEmptyState
        title="Integrity Detail"
        description="Carregando detalhe de integridade do contrato..."
      />
    );
  }

  if (error) {
    return <OperationalEmptyState title="Erro operacional" description={error} />;
  }

  if (!contract) {
    return (
      <OperationalEmptyState
        title="Contrato nao encontrado"
        description="Nao foi possivel localizar esse contrato na leitura atual de integridade."
      />
    );
  }

  if (contract.issues.length === 0) {
    return (
      <OperationalEmptyState
        title="Sem issues"
        description="Este contrato nao possui inconsistencias na leitura atual do motor de integridade."
      />
    );
  }

  const errorCount = contract.issues.filter((issue) => issue.severity === "error").length;
  const warningCount = contract.issues.length - errorCount;
  const contractHref = `/operations/contracts?contractId=${encodeURIComponent(contract.contractId)}&origem=integridade`;

  return (
    <div className="grid gap-5">
      <OperationsPageHeader
        eyebrow="Operations Integrity Detail"
        title={`Contrato ${contract.contractNumber ?? "Sem numero"}`}
        description="Leitura detalhada do Master Data Integrity Engine para este contrato, incluindo plano, snapshot, agenda, expected revenue e recomendacoes operacionais."
      />

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">
                Status {contract.status}
              </span>
              <span
                className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                  errorCount > 0
                    ? "border-rose-200 bg-rose-100 text-rose-800"
                    : "border-amber-200 bg-amber-100 text-amber-800"
                }`}
              >
                {errorCount > 0 ? "Critico" : "Warning"}
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              {errorCount} error(s), {warningCount} warning(s) e {contract.issues.length} issue(s) totais nesta leitura.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <OperationsContextLink href="/operations/integrity">
              Voltar para integrity
            </OperationsContextLink>
            <OperationsContextLink href={contractHref}>
              Ver contratos
            </OperationsContextLink>
          </div>
        </div>
      </section>

      <section className="grid gap-3 lg:grid-cols-2">
        <InfoCard
          title="Dados basicos"
          rows={[
            ["Contrato", contract.contractNumber ?? "Sem numero"],
            ["Cliente", contract.clientName ?? "Nao disponivel"],
            ["Administradora", contract.administratorName ?? "Nao disponivel"],
            ["Status", contract.status],
            ["Credito", formatCurrency(contract.creditAmount)],
          ]}
        />
        <InfoCard
          title="Plano de comissao"
          rows={[
            ["commission_plan_id", contract.commissionPlanId ?? "Nao vinculado"],
            ["Plano", contract.commissionPlanName ?? "Nao encontrado"],
            ["Status do plano", contract.commissionPlanStatus ?? "Nao disponivel"],
            ["Itens da regua", String(contract.planScheduleItemsCount)],
          ]}
        />
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Snapshot"
          value={contract.hasSnapshot ? "Existente" : "Ausente"}
        />
        <MetricCard label="Snapshots" value={String(contract.snapshotCount)} />
        <MetricCard
          label="Snapshot items"
          value={String(contract.snapshotItemsCount)}
        />
        <MetricCard
          label="Schedule items"
          value={String(contract.contractCommissionScheduleItemsCount)}
        />
        <MetricCard
          label="Expected revenue"
          value={String(contract.expectedRevenueEntriesCount)}
        />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Integrity Issues
        </p>
        <h2 className="mt-2 text-xl font-semibold text-slate-950">
          Recomendacoes operacionais
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">
          Cada issue abaixo mostra o diagnostico atual e a recomendacao operacional associada, sem disparar qualquer correcao automatica.
        </p>
        <div className="mt-5">
          <OperationsIntegrityIssueList issues={contract.issues} />
        </div>
      </section>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </p>
      <p className="mt-3 text-2xl font-semibold text-slate-950">{value}</p>
    </article>
  );
}

function InfoCard({
  rows,
  title,
}: {
  rows: Array<[string, string]>;
  title: string;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
        {title}
      </p>
      <dl className="mt-4 grid gap-3">
        {rows.map(([label, value]) => (
          <div
            className="flex flex-wrap items-start justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2"
            key={label}
          >
            <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              {label}
            </dt>
            <dd className="text-sm font-medium text-slate-950">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}
