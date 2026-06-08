import {
  createResultSnapshot,
  type SimulatorCommercialPresentation,
} from "@/modules/simulator";
import type {
  Operation,
  OperationDraft,
  OperationsSummary,
} from "@/modules/operations/operation-types";

export function buildOperationFromDraft({
  draft,
  existingOperation,
  presentation,
}: {
  draft: OperationDraft;
  existingOperation?: Operation | null;
  presentation: SimulatorCommercialPresentation;
}): Operation {
  const now = new Date().toISOString();
  const results = createResultSnapshot(presentation);

  return {
    ...draft,
    id: existingOperation?.id ?? draft.id ?? createOperationId(),
    nome: normalizeOperationName(draft.nome, existingOperation?.nome),
    administradora: draft.administratorData.selectedAdministratorName,
    credito: presentation.contractedCredit,
    tipoOperacao: draft.tipoOperacao ?? existingOperation?.tipoOperacao ?? "consortium",
    status: draft.status ?? existingOperation?.status ?? "active",
    createdAt: existingOperation?.createdAt ?? draft.createdAt ?? now,
    updatedAt: now,
    snapshot: {
      cenario: presentation.selectedScenarioName,
      contemplacao: presentation.contemplationMonth,
      parcela: presentation.installmentBeforeContemplation,
      posContemplacao: presentation.installmentAfterContemplation,
      lucro: presentation.estimatedCardSaleProfit,
      ganho: presentation.estimatedCardSaleGainRate,
      alavancagem: presentation.leverageMultiple,
    },
    results,
    strategyId: existingOperation?.strategyId ?? null,
  };
}

export function summarizeOperations(operations: Operation[]): OperationsSummary {
  const activeOperations = operations.filter(
    (operation) => operation.status === "active",
  );

  return {
    activeOperationsCount: activeOperations.length,
    potentialPatrimony: activeOperations.reduce(
      (total, operation) => total + Math.max(0, operation.results.estimatedCardSaleValue),
      0,
    ),
    totalContractedCredit: activeOperations.reduce(
      (total, operation) => total + Math.max(0, operation.credito),
      0,
    ),
  };
}

function normalizeOperationName(name: string, fallback?: string) {
  const trimmedName = name.trim();

  if (trimmedName) {
    return trimmedName;
  }

  return fallback?.trim() || "Operacao";
}

function createOperationId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `operation-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

