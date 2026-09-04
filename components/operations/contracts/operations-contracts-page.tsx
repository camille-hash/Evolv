"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ContractEditDialog } from "@/components/contracts/contract-edit-dialog";
import { ContractStatusDialog } from "@/components/contracts/contract-status-dialog";
import type { Contract } from "@/modules/contracts/types";
import type { ContractStatus } from "@/modules/contracts/types";
import { fetchOperationsContracts } from "@/modules/operations/contracts-client";
import type { ContractActivationResult } from "@/modules/contracts/contract-activation-types";
import type {
  OperationsContractsResponse,
  OperationsContractsSummary,
  OperationsContractRow,
} from "@/modules/operations/contracts-types";
import { OperationalEmptyState } from "../operational-empty-state";
import { OperationsContextLink } from "../operations-context-link";
import { OperationsContractsList } from "./operations-contracts-list";
import { OperationsContractsSummary as OperationsContractsSummaryCards } from "./operations-contracts-summary";

type ContractVisibilityFilter = "active" | "all" | "inactive";

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
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [feedbackTone, setFeedbackTone] = useState<"warning" | "success">(
    "success",
  );
  const [visibilityFilter, setVisibilityFilter] =
    useState<ContractVisibilityFilter>("all");
  const [highlightedContractId, setHighlightedContractId] = useState<
    string | null
  >(null);
  const [selectedStatusContract, setSelectedStatusContract] =
    useState<OperationsContractRow | null>(null);
  const [selectedEditContract, setSelectedEditContract] =
    useState<OperationsContractRow | null>(null);

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

  async function refreshContracts() {
    setError(null);

    try {
      const loadedContracts = await fetchOperationsContracts();
      setContractsResponse(loadedContracts);
    } catch (refreshError) {
      setError(
        refreshError instanceof Error
          ? refreshError.message
          : "Nao foi possivel carregar os contratos operacionais.",
      );
    }
  }

  async function handleContractStatusUpdated(result: ContractActivationResult) {
    await refreshContracts();
    setFeedbackMessage(
      result.financialOutcome === "not_applicable" ? "Contrato ativado. Nao ha comissao aplicavel para este contrato." : result.financialOutcome === "failed" ? "Contrato alterado, mas o processamento financeiro requer atencao." : "Situacao do contrato atualizada com sucesso.",
    );
    setFeedbackTone(result.financialOutcome === "failed" ? "warning" : "success");
  }

  async function handleContractUpdated(contract: Contract) {
    await refreshContracts();
    setFeedbackMessage(
      contract.contractNumber
        ? "Numero do contrato atualizado com sucesso."
        : "Contrato atualizado com sucesso.",
    );
    setFeedbackTone("success");
  }

  const pageContext = readContractsPageContext(searchParams);
  const allContracts = contractsResponse?.contracts ?? [];
  const contextualContracts = filterContractsByContext(allContracts, pageContext);
  const visibleContracts = filterContractsByVisibility(
    contextualContracts,
    visibilityFilter,
  );
  const summary = summarizeContracts(visibleContracts);

  useEffect(() => {
    if (!pageContext.contractId) {
      return;
    }

    setVisibilityFilter("all");
  }, [pageContext.contractId]);

  useEffect(() => {
    if (!pageContext.contractId) {
      setHighlightedContractId(null);
      return;
    }

    const targetContract = visibleContracts.find(
      (contract) => contract.id === pageContext.contractId,
    );

    if (!targetContract) {
      setHighlightedContractId(null);
      return;
    }

    setHighlightedContractId(targetContract.id);

    const frameId = window.requestAnimationFrame(() => {
      const element = document.getElementById(
        `operations-contract-${targetContract.id}`,
      );
      element?.scrollIntoView({ behavior: "smooth", block: "center" });
    });

    const timeoutId = window.setTimeout(() => {
      setHighlightedContractId((currentValue) =>
        currentValue === targetContract.id ? null : currentValue,
      );
    }, 2500);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(timeoutId);
    };
  }, [pageContext.contractId, visibleContracts]);

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

      {feedbackMessage ? (
        <div
          className={`rounded-xl border p-4 text-sm ${
            feedbackTone === "warning"
              ? "border-amber-200 bg-amber-50 text-amber-900"
              : "border-emerald-200 bg-emerald-50 text-emerald-900"
          }`}
        >
          {feedbackMessage}
        </div>
      ) : null}

      <StatusVisibilityFilter
        currentValue={visibilityFilter}
        onChange={setVisibilityFilter}
        title="Filtrar contratos por situacao"
      />

      <OperationsContractsSummaryCards summary={summary} />

      {pageContext.contractId && visibleContracts.length === 0 ? (
        <OperationalEmptyState
          title="Contrato nao encontrado neste contexto"
          description="A Mesa de Trabalho apontou para um contrato especifico, mas ele nao apareceu na leitura operacional atual."
        />
      ) : (
        <OperationsContractsList
          contracts={visibleContracts}
          highlightedContractId={highlightedContractId}
          onChangeStatus={contractsResponse?.canManageLifecycle ? (contract) => {
            setSelectedStatusContract(contract);
            setFeedbackMessage(null);
          } : undefined}
          onResolveMissingContractNumber={(contract) => {
            setSelectedEditContract(contract);
            setFeedbackMessage(null);
          }}
          operationalTimelineContractId={
            pageContext.contractId && visibleContracts.length === 1
              ? pageContext.contractId
              : null
          }
        />
      )}

      {selectedStatusContract ? (
        <ContractStatusDialog
          contractId={selectedStatusContract.id}
          contractLabel={
            selectedStatusContract.contractNumber
              ? `Contrato ${selectedStatusContract.contractNumber}`
              : `Contrato de ${selectedStatusContract.clientName}`
          }
          currentStatus={
            resolveCurrentContractStatus(selectedStatusContract) ?? "active"
          }
          isOpen
          onClose={() => setSelectedStatusContract(null)}
          onUpdated={async (result) => {
            await handleContractStatusUpdated(result);
            setSelectedStatusContract(null);
          }}
        />
      ) : null}

      {selectedEditContract ? (
        <ContractEditDialog
          contractId={selectedEditContract.id}
          contractLabel={
            selectedEditContract.contractNumber
              ? `Contrato ${selectedEditContract.contractNumber}`
              : `Contrato de ${selectedEditContract.clientName}`
          }
          initialContractNumber={selectedEditContract.contractNumber}
          isOpen
          onClose={() => setSelectedEditContract(null)}
          onUpdated={async (contract) => {
            await handleContractUpdated(contract);
            setSelectedEditContract(null);
          }}
        />
      ) : null}
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

function filterContractsByVisibility(
  contracts: OperationsContractRow[],
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

function summarizeContracts(
  contracts: OperationsContractRow[],
): OperationsContractsSummary {
  return contracts.reduce<OperationsContractsSummary>(
    (summary, contract) => {
      summary.totalContracts += 1;
      summary.totalCreditValue = roundCurrency(
        summary.totalCreditValue + contract.creditValue,
      );
      summary.estimatedRevenue = roundCurrency(
        summary.estimatedRevenue + contract.estimatedRevenue,
      );
      summary.recognizedRevenue = roundCurrency(
        summary.recognizedRevenue + contract.recognizedRevenue,
      );

      if (contract.status === "active") {
        summary.activeContracts += 1;
        summary.activeCreditValue = roundCurrency(
          summary.activeCreditValue + contract.creditValue,
        );
      }

      if (contract.status === "attention") {
        summary.attentionContracts += 1;
      }

      return summary;
    },
    {
      activeContracts: 0,
      activeCreditValue: 0,
      attentionContracts: 0,
      estimatedRevenue: 0,
      recognizedRevenue: 0,
      totalContracts: 0,
      totalCreditValue: 0,
    },
  );
}

function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
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

function resolveCurrentContractStatus(
  contract: OperationsContractRow,
): ContractStatus | null {
  if (
    contract.sourceStatus === "draft" ||
    contract.sourceStatus === "pending_documentation" ||
    contract.sourceStatus === "submitted" ||
    contract.sourceStatus === "approved" ||
    contract.sourceStatus === "active" ||
    contract.sourceStatus === "inactive" ||
    contract.sourceStatus === "completed" ||
    contract.sourceStatus === "cancelled" ||
    contract.sourceStatus === "rejected"
  ) {
    return contract.sourceStatus;
  }

  return null;
}
