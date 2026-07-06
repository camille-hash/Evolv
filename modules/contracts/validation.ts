import type {
  ContractInput,
  ContractInactiveAction,
  ContractListFilters,
  ContractStatus,
  ContractStatusInput,
} from "./types";

export const contractStatuses: ContractStatus[] = [
  "draft",
  "pending_documentation",
  "submitted",
  "approved",
  "active",
  "inactive",
  "completed",
  "cancelled",
  "rejected",
];

const contractInactiveActions: ContractInactiveAction[] = [
  "keep_future_entries",
  "cancel_future_entries",
  "cancel_totally",
];

export function isContractStatus(value: unknown): value is ContractStatus {
  return (
    typeof value === "string" &&
    contractStatuses.includes(value as ContractStatus)
  );
}

export function parseContractInput(value: unknown) {
  if (!isRecord(value)) {
    return invalid("Informe os dados do contrato.");
  }

  const input: ContractInput = {};

  const nullableTextFields = [
    ["leadId", "leadId"],
    ["clientId", "clientId"],
    ["administratorId", "administratorId"],
    ["commissionPlanId", "commissionPlanId"],
    ["contractNumber", "contractNumber"],
    ["productType", "productType"],
    ["contemplationModel", "contemplationModel"],
    ["signedAt", "signedAt"],
    ["submittedAt", "submittedAt"],
    ["approvedAt", "approvedAt"],
    ["activatedAt", "activatedAt"],
    ["cancelledAt", "cancelledAt"],
    ["completedAt", "completedAt"],
    ["rejectedAt", "rejectedAt"],
  ] as const;

  for (const [sourceKey, targetKey] of nullableTextFields) {
    if (sourceKey in value) {
      input[targetKey] = normalizeNullableText(value[sourceKey]);
    }
  }

  if ("status" in value) {
    if (!isContractStatus(value.status)) {
      return invalid("Status de contrato invalido.");
    }

    input.status = value.status;
  }

  if ("creditAmount" in value) {
    const creditAmount = normalizeNonNegativeNumber(value.creditAmount);

    if (creditAmount === null) {
      return invalid("Valor de credito invalido.");
    }

    input.creditAmount = creditAmount;
  }

  if ("installmentAmount" in value) {
    const installmentAmount = normalizeNullableNonNegativeNumber(
      value.installmentAmount,
    );

    if (installmentAmount === undefined) {
      return invalid("Valor de parcela invalido.");
    }

    input.installmentAmount = installmentAmount;
  }

  if ("termMonths" in value) {
    const termMonths = normalizeNullablePositiveInteger(value.termMonths);

    if (termMonths === undefined) {
      return invalid("Prazo do contrato invalido.");
    }

    input.termMonths = termMonths;
  }

  if ("metadata" in value) {
    if (!isRecord(value.metadata)) {
      return invalid("Metadata do contrato invalida.");
    }

    input.metadata = value.metadata;
  }

  return {
    input,
    ok: true as const,
  };
}

export function parseContractStatusInput(value: unknown) {
  if (!isRecord(value) || !isContractStatus(value.status)) {
    return invalid("Status de contrato invalido.");
  }

  const inactiveAction =
    "inactiveAction" in value
      ? normalizeInactiveAction(value.inactiveAction)
      : null;

  if ("inactiveAction" in value && inactiveAction === undefined) {
    return invalid("Acao operacional de inativacao invalida.");
  }

  const notes =
    "notes" in value ? normalizeNullableText(value.notes) : null;

  return {
    input: {
      inactiveAction,
      notes,
      status: value.status,
    } satisfies ContractStatusInput,
    ok: true as const,
  };
}

export function parseContractListFilters(params: URLSearchParams) {
  const status = params.get("status");
  const limit = params.get("limit");
  const offset = params.get("offset");
  const filters: ContractListFilters = {
    administratorId: normalizeNullableText(params.get("administratorId")),
    clientId: normalizeNullableText(params.get("clientId")),
    leadId: normalizeNullableText(params.get("leadId")),
  };

  if (status) {
    if (!isContractStatus(status)) {
      return invalid("Status de contrato invalido.");
    }

    filters.status = status;
  }

  if (limit) {
    const parsedLimit = Number(limit);

    if (!Number.isInteger(parsedLimit) || parsedLimit < 1) {
      return invalid("Limite invalido.");
    }

    filters.limit = Math.min(parsedLimit, 100);
  }

  if (offset) {
    const parsedOffset = Number(offset);

    if (!Number.isInteger(parsedOffset) || parsedOffset < 0) {
      return invalid("Offset invalido.");
    }

    filters.offset = parsedOffset;
  }

  return {
    filters,
    ok: true as const,
  };
}

function normalizeNullableText(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed || null;
}

function normalizeNonNegativeNumber(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return null;
  }

  return value;
}

function normalizeNullableNonNegativeNumber(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  return normalizeNonNegativeNumber(value) ?? undefined;
}

function normalizeNullablePositiveInteger(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    return undefined;
  }

  return value;
}

function normalizeInactiveAction(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (
    typeof value === "string" &&
    contractInactiveActions.includes(value as ContractInactiveAction)
  ) {
    return value as ContractInactiveAction;
  }

  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value),
  );
}

function invalid(error: string) {
  return {
    error,
    ok: false as const,
    status: 400,
  };
}
