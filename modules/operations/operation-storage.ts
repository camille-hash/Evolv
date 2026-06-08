import {
  buildOperationFromDraft,
} from "@/modules/operations/operation-engine";
import type {
  Operation,
  OperationDraft,
} from "@/modules/operations/operation-types";
import type { SimulatorCommercialPresentation } from "@/modules/simulator";

export const OPERATIONS_STORAGE_KEY = "evolv.operations.v1";

export function loadOperations(): Operation[] {
  if (!canUseLocalStorage()) {
    return [];
  }

  const rawValue = window.localStorage.getItem(OPERATIONS_STORAGE_KEY);

  if (!rawValue) {
    return [];
  }

  try {
    const parsedValue = JSON.parse(rawValue);

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue
      .map(normalizeOperation)
      .filter((operation): operation is Operation => Boolean(operation))
      .sort((first, second) => first.createdAt.localeCompare(second.createdAt));
  } catch {
    return [];
  }
}

export function saveOperation({
  draft,
  presentation,
}: {
  draft: OperationDraft;
  presentation: SimulatorCommercialPresentation;
}): Operation[] {
  const operations = loadOperations();
  const existingOperation = draft.id
    ? operations.find((operation) => operation.id === draft.id)
    : null;
  const operation = buildOperationFromDraft({
    draft,
    existingOperation,
    presentation,
  });
  const nextOperations = existingOperation
    ? operations.map((currentOperation) =>
        currentOperation.id === operation.id ? operation : currentOperation,
      )
    : [...operations, operation];

  persistOperations(nextOperations);

  return nextOperations;
}

export function createNextOperation({
  sourceOperation,
}: {
  sourceOperation: Operation;
}): Operation[] {
  const operations = loadOperations();
  const now = new Date().toISOString();
  const nextOperationNumber = operations.length + 1;
  const nextOperation: Operation = {
    ...sourceOperation,
    id: createOperationId(),
    nome: `Operacao ${nextOperationNumber}`,
    createdAt: now,
    updatedAt: now,
  };
  const nextOperations = [...operations, nextOperation];

  persistOperations(nextOperations);

  return nextOperations;
}

export function ensureInitialOperation({
  draft,
  presentation,
}: {
  draft: OperationDraft;
  presentation: SimulatorCommercialPresentation;
}): Operation[] {
  const operations = loadOperations();

  if (operations.length > 0) {
    return operations;
  }

  return saveOperation({
    draft: {
      ...draft,
      nome: "Operacao 1",
    },
    presentation,
  });
}

function persistOperations(operations: Operation[]) {
  if (!canUseLocalStorage()) {
    return;
  }

  window.localStorage.setItem(
    OPERATIONS_STORAGE_KEY,
    JSON.stringify(operations),
  );
}

function normalizeOperation(value: unknown): Operation | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const operation = value as Partial<Operation>;

  if (
    !operation.id ||
    !operation.nome ||
    !operation.createdAt ||
    !operation.updatedAt ||
    !operation.formState ||
    !operation.commercialData ||
    !operation.administratorData ||
    !operation.results ||
    !operation.snapshot
  ) {
    return null;
  }

  return {
    ...operation,
    tipoOperacao: operation.tipoOperacao ?? "consortium",
    status: operation.status ?? "active",
    strategyId: operation.strategyId ?? null,
  } as Operation;
}

function createOperationId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `operation-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function canUseLocalStorage() {
  return typeof window !== "undefined" && "localStorage" in window;
}

