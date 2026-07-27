"use client";

import { useEffect, useState } from "react";
import { fetchOperationsContracts } from "@/modules/operations/contracts-client";
import type {
  OperationsContractRow,
  OperationsContractStatus,
} from "@/modules/operations/contracts-types";
import { OperationalEmptyState } from "../operational-empty-state";
import { OperationsContextLink } from "../operations-context-link";
import { OperationsPageHeader } from "../operations-page-header";
import { ContractCommissionSummaryCard } from "./contract-commission-summary-card";
import { ContractOperationalTimeline } from "./contract-operational-timeline";

type WorkspaceTab = "summary" | "timeline";

const statusLabels: Record<OperationsContractStatus, string> = {
  active: "Ativo",
  attention: "Atenção",
  cancelled: "Cancelado",
  completed: "Concluído",
  inactive: "Inativo",
  pending: "Pendente",
  unknown: "Indefinido",
};

const currency = new Intl.NumberFormat("pt-BR", {
  currency: "BRL",
  style: "currency",
});

export function OperationsContractWorkspace({
  contractId,
}: {
  contractId: string;
}) {
  const [contract, setContract] = useState<OperationsContractRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("summary");

  useEffect(() => {
    let isActive = true;

    fetchOperationsContracts()
      .then((response) => {
        if (isActive) {
          setContract(
            response.contracts.find((item) => item.id === contractId) ?? null,
          );
        }
      })
      .catch((cause: unknown) => {
        if (isActive) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Não foi possível carregar o contrato.",
          );
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [contractId]);

  if (isLoading) {
    return (
      <OperationalEmptyState
        description="Carregando Workspace do Contrato..."
        title="Contrato"
      />
    );
  }

  if (error) {
    return <OperationalEmptyState description={error} title="Erro operacional" />;
  }

  if (!contract) {
    return (
      <div className="grid gap-4">
        <OperationalEmptyState
          description="O contrato não está disponível na organização autenticada."
          title="Contrato não encontrado"
        />
        <div>
          <OperationsContextLink href="/operations/contracts">
            Voltar para contratos
          </OperationsContextLink>
        </div>
      </div>
    );
  }

  const contractTitle = contract.contractNumber
    ? `Contrato ${contract.contractNumber}`
    : `Contrato de ${contract.clientName}`;

  return (
    <div className="grid gap-5">
      <OperationsPageHeader
        description="Ponto oficial para acompanhar dados, situação e histórico operacional deste contrato."
        eyebrow="Contract Workspace"
        title={contractTitle}
      />

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">
                {statusLabels[contract.status]}
              </span>
              {contract.group ? (
                <span className="text-sm text-slate-500">
                  Grupo {contract.group}
                </span>
              ) : null}
              {contract.quota ? (
                <span className="text-sm text-slate-500">
                  Cota {contract.quota}
                </span>
              ) : null}
            </div>
            <p className="mt-3 text-lg font-semibold text-slate-950">
              {contract.clientName}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {contract.administratorName}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <OperationsContextLink href="/operations/contracts">
              Voltar para contratos
            </OperationsContextLink>
            <OperationsContextLink
              href={`/operations/integrity/${encodeURIComponent(contract.id)}`}
            >
              Ver integridade
            </OperationsContextLink>
          </div>
        </div>
      </section>

      <nav
        aria-label="Navegação do Workspace do Contrato"
        className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm"
      >
        <WorkspaceTabButton
          active={activeTab === "summary"}
          onClick={() => setActiveTab("summary")}
        >
          Resumo
        </WorkspaceTabButton>
        <WorkspaceTabButton
          active={activeTab === "timeline"}
          onClick={() => setActiveTab("timeline")}
        >
          Timeline Operacional
        </WorkspaceTabButton>
      </nav>

      {activeTab === "summary" ? (
        <ContractSummary contract={contract} />
      ) : (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <ContractOperationalTimeline
            contractId={contract.id}
            creditValue={contract.creditValue}
          />
        </section>
      )}
    </div>
  );
}

function ContractSummary({ contract }: { contract: OperationsContractRow }) {
  return (
    <div className="grid gap-5">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryMetric label="Crédito" value={currency.format(contract.creditValue)} />
        <SummaryMetric
          label="Receita estimada"
          value={currency.format(contract.estimatedRevenue)}
        />
        <SummaryMetric
          label="Receita reconhecida"
          value={currency.format(contract.recognizedRevenue)}
        />
        <SummaryMetric
          label="Situação"
          value={statusLabels[contract.status]}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-950">
            Identificação operacional
          </h2>
          <dl className="mt-4 grid gap-3">
            <SummaryRow
              label="Contrato"
              value={contract.contractNumber ?? "Não informado"}
            />
            <SummaryRow label="Cliente" value={contract.clientName} />
            <SummaryRow
              label="Administradora"
              value={contract.administratorName}
            />
            <SummaryRow label="Grupo" value={contract.group ?? "Não informado"} />
            <SummaryRow label="Cota" value={contract.quota ?? "Não informada"} />
          </dl>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-950">
            Acompanhamento
          </h2>
          {contract.attentionItems.length ? (
            <ul className="mt-4 grid gap-2">
              {contract.attentionItems.map((item) => (
                <li
                  className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
                  key={item}
                >
                  {item}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-slate-500">
              Nenhuma pendência operacional identificada.
            </p>
          )}
        </article>
      </section>

      <ContractCommissionSummaryCard summary={contract.commissionSummary} />
    </div>
  );
}

function WorkspaceTabButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      aria-current={active ? "page" : undefined}
      className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
        active
          ? "bg-slate-900 text-white"
          : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
      }`}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-lg font-semibold text-slate-950">{value}</p>
    </article>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2">
      <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </dt>
      <dd className="text-sm font-medium text-slate-950">{value}</dd>
    </div>
  );
}
