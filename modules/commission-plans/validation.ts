import type {
  CommissionPaymentTrigger,
  CommissionPlanCreateInput,
  CommissionPlanListFilters,
  CommissionPlanScheduleItemInput,
  CommissionPlanStatus,
  CommissionPlanUpdateInput,
  CommissionScheduleEventType,
  CommissionType,
} from "./types";

export const commissionPlanStatuses: CommissionPlanStatus[] = [
  "active",
  "inactive",
];

export const commissionTypes: CommissionType[] = [
  "fixed",
  "hybrid",
  "percentage",
];

export const commissionPaymentTriggers: CommissionPaymentTrigger[] = [
  "contract_activation",
  "contract_approved",
  "contract_signed",
  "contract_submitted",
  "manual",
];

export const commissionScheduleEventTypes: CommissionScheduleEventType[] = [
  "contemplation",
  "installment",
];

export function isCommissionPlanStatus(
  value: unknown,
): value is CommissionPlanStatus {
  return (
    typeof value === "string" &&
    commissionPlanStatuses.includes(value as CommissionPlanStatus)
  );
}

export function isCommissionType(value: unknown): value is CommissionType {
  return (
    typeof value === "string" &&
    commissionTypes.includes(value as CommissionType)
  );
}

export function isCommissionPaymentTrigger(
  value: unknown,
): value is CommissionPaymentTrigger {
  return (
    typeof value === "string" &&
    commissionPaymentTriggers.includes(value as CommissionPaymentTrigger)
  );
}

export function isCommissionScheduleEventType(
  value: unknown,
): value is CommissionScheduleEventType {
  return (
    typeof value === "string" &&
    commissionScheduleEventTypes.includes(value as CommissionScheduleEventType)
  );
}

export function parseCommissionPlanCreateInput(value: unknown) {
  if (!isRecord(value)) {
    return invalid("Informe os dados do plano de comissao.");
  }

  const administratorId = normalizeText(value.administratorId);
  const name = normalizeText(value.name);

  if (!administratorId) {
    return invalid("Administradora e obrigatoria.");
  }

  if (!name) {
    return invalid("Nome do plano de comissao e obrigatorio.");
  }

  if (!isCommissionType(value.commissionType)) {
    return invalid("Tipo de comissao invalido.");
  }

  if (!isCommissionPaymentTrigger(value.paymentTrigger)) {
    return invalid("Gatilho de pagamento invalido.");
  }

  const paymentInstallments =
    "paymentInstallments" in value
      ? normalizePositiveInteger(value.paymentInstallments)
      : 1;
  const contractTermMonths =
    "contractTermMonths" in value
      ? normalizeNullablePositiveInteger(value.contractTermMonths)
      : null;
  const referenceCreditAmount =
    "referenceCreditAmount" in value
      ? normalizeNullableNonNegativeNumber(value.referenceCreditAmount)
      : null;
  const administrationFeePercentage =
    "administrationFeePercentage" in value
      ? normalizeNullableNonNegativeNumber(value.administrationFeePercentage)
      : null;

  if (paymentInstallments === null) {
    return invalid("Parcelas de pagamento invalidas.");
  }

  if (contractTermMonths === undefined) {
    return invalid("Prazo do contrato invalido.");
  }

  if (referenceCreditAmount === undefined) {
    return invalid("Valor de referencia invalido.");
  }

  if (administrationFeePercentage === undefined) {
    return invalid("Taxa administrativa invalida.");
  }

  const commissionPercentage =
    "commissionPercentage" in value
      ? normalizeNullablePositiveNumber(value.commissionPercentage)
      : null;
  const commissionFixedAmount =
    "commissionFixedAmount" in value
      ? normalizeNullablePositiveNumber(value.commissionFixedAmount)
      : null;

  if (commissionPercentage === undefined) {
    return invalid("Percentual de comissao invalido.");
  }

  if (commissionFixedAmount === undefined) {
    return invalid("Valor fixo de comissao invalido.");
  }

  const financialValidation = validateCommissionFinancialRules({
    commissionFixedAmount,
    commissionPercentage,
    commissionType: value.commissionType,
  });

  if (!financialValidation.ok) {
    return financialValidation;
  }

  const scheduleItemsResult =
    "scheduleItems" in value
      ? parseScheduleItems(value.scheduleItems)
      : { ok: true as const, scheduleItems: undefined };

  if (!scheduleItemsResult.ok) {
    return scheduleItemsResult;
  }

  const input: CommissionPlanCreateInput = {
    administratorId,
    administrationFeePercentage,
    commissionFixedAmount,
    commissionPercentage,
    commissionType: value.commissionType,
    contractTermMonths,
    name,
    paymentInstallments,
    paymentTrigger: value.paymentTrigger,
    referenceCreditAmount,
  };

  if (scheduleItemsResult.scheduleItems) {
    input.scheduleItems = scheduleItemsResult.scheduleItems;
  }

  if ("status" in value) {
    if (!isCommissionPlanStatus(value.status)) {
      return invalid("Status do plano de comissao invalido.");
    }

    input.status = value.status;
  }

  if ("metadata" in value) {
    if (!isRecord(value.metadata)) {
      return invalid("Metadata do plano de comissao invalida.");
    }

    input.metadata = value.metadata;
  }

  return {
    input,
    ok: true as const,
  };
}

export function parseCommissionPlanUpdateInput(value: unknown) {
  if (!isRecord(value)) {
    return invalid("Informe os dados do plano de comissao.");
  }

  const input: CommissionPlanUpdateInput = {};

  if ("administratorId" in value) {
    const administratorId = normalizeText(value.administratorId);

    if (!administratorId) {
      return invalid("Administradora e obrigatoria.");
    }

    input.administratorId = administratorId;
  }

  if ("name" in value) {
    const name = normalizeText(value.name);

    if (!name) {
      return invalid("Nome do plano de comissao e obrigatorio.");
    }

    input.name = name;
  }

  if ("status" in value) {
    if (!isCommissionPlanStatus(value.status)) {
      return invalid("Status do plano de comissao invalido.");
    }

    input.status = value.status;
  }

  if ("commissionType" in value) {
    if (!isCommissionType(value.commissionType)) {
      return invalid("Tipo de comissao invalido.");
    }

    input.commissionType = value.commissionType;
  }

  if ("commissionPercentage" in value) {
    const commissionPercentage = normalizeNullablePositiveNumber(
      value.commissionPercentage,
    );

    if (commissionPercentage === undefined) {
      return invalid("Percentual de comissao invalido.");
    }

    input.commissionPercentage = commissionPercentage;
  }

  if ("commissionFixedAmount" in value) {
    const commissionFixedAmount = normalizeNullablePositiveNumber(
      value.commissionFixedAmount,
    );

    if (commissionFixedAmount === undefined) {
      return invalid("Valor fixo de comissao invalido.");
    }

    input.commissionFixedAmount = commissionFixedAmount;
  }

  if ("paymentTrigger" in value) {
    if (!isCommissionPaymentTrigger(value.paymentTrigger)) {
      return invalid("Gatilho de pagamento invalido.");
    }

    input.paymentTrigger = value.paymentTrigger;
  }

  if ("paymentInstallments" in value) {
    const paymentInstallments = normalizePositiveInteger(
      value.paymentInstallments,
    );

    if (paymentInstallments === null) {
      return invalid("Parcelas de pagamento invalidas.");
    }

    input.paymentInstallments = paymentInstallments;
  }

  if ("contractTermMonths" in value) {
    const contractTermMonths = normalizeNullablePositiveInteger(
      value.contractTermMonths,
    );

    if (contractTermMonths === undefined) {
      return invalid("Prazo do contrato invalido.");
    }

    input.contractTermMonths = contractTermMonths;
  }

  if ("referenceCreditAmount" in value) {
    const referenceCreditAmount = normalizeNullableNonNegativeNumber(
      value.referenceCreditAmount,
    );

    if (referenceCreditAmount === undefined) {
      return invalid("Valor de referencia invalido.");
    }

    input.referenceCreditAmount = referenceCreditAmount;
  }

  if ("administrationFeePercentage" in value) {
    const administrationFeePercentage = normalizeNullableNonNegativeNumber(
      value.administrationFeePercentage,
    );

    if (administrationFeePercentage === undefined) {
      return invalid("Taxa administrativa invalida.");
    }

    input.administrationFeePercentage = administrationFeePercentage;
  }

  if ("scheduleItems" in value) {
    const scheduleItemsResult = parseScheduleItems(value.scheduleItems);

    if (!scheduleItemsResult.ok) {
      return scheduleItemsResult;
    }

    input.scheduleItems = scheduleItemsResult.scheduleItems;
  }

  if ("metadata" in value) {
    if (!isRecord(value.metadata)) {
      return invalid("Metadata do plano de comissao invalida.");
    }

    input.metadata = value.metadata;
  }

  return {
    input,
    ok: true as const,
  };
}

export function parseCommissionPlanListFilters(params: URLSearchParams) {
  const status = params.get("status");
  const limit = params.get("limit");
  const offset = params.get("offset");
  const filters: CommissionPlanListFilters = {
    administratorId: normalizeNullableText(params.get("administratorId")),
    search: normalizeNullableText(params.get("search")),
  };

  if (status) {
    if (!isCommissionPlanStatus(status)) {
      return invalid("Status do plano de comissao invalido.");
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

export function validateCommissionFinancialRules(input: {
  commissionFixedAmount: number | null;
  commissionPercentage: number | null;
  commissionType: CommissionType;
}) {
  if (
    input.commissionType === "percentage" &&
    !isPositiveNumber(input.commissionPercentage)
  ) {
    return invalid("Plano percentual exige percentual de comissao maior que zero.");
  }

  if (
    input.commissionType === "fixed" &&
    !isPositiveNumber(input.commissionFixedAmount)
  ) {
    return invalid("Plano fixo exige valor fixo de comissao maior que zero.");
  }

  if (
    input.commissionType === "hybrid" &&
    !isPositiveNumber(input.commissionPercentage) &&
    !isPositiveNumber(input.commissionFixedAmount)
  ) {
    return invalid(
      "Plano hibrido exige percentual ou valor fixo maior que zero.",
    );
  }

  return {
    ok: true as const,
  };
}

function normalizeNullablePositiveNumber(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return undefined;
  }

  return value;
}

function normalizeNullableNonNegativeNumber(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return undefined;
  }

  return value;
}

function normalizeNullablePositiveInteger(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
    return undefined;
  }

  return value;
}

function normalizePositiveInteger(value: unknown) {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
    return null;
  }

  return value;
}

function parseScheduleItems(value: unknown) {
  if (!Array.isArray(value)) {
    return invalid("Regua de comissao invalida.");
  }

  const scheduleItems: CommissionPlanScheduleItemInput[] = [];
  const seenKeys = new Set<string>();

  for (const [index, item] of value.entries()) {
    if (!isRecord(item)) {
      return invalid("Linha da regua de comissao invalida.");
    }

    if (!isCommissionScheduleEventType(item.eventType)) {
      return invalid("Tipo de evento da regua invalido.");
    }

    const installmentNumber =
      item.eventType === "installment"
        ? normalizePositiveInteger(item.installmentNumber)
        : null;
    const percentage = normalizeNonNegativeNumber(item.percentage);
    const amount =
      "amount" in item ? normalizeNonNegativeNumber(item.amount) : 0;
    const offsetMonths =
      "offsetMonths" in item
        ? normalizeNullableNonNegativeInteger(item.offsetMonths)
        : null;
    const offsetDays =
      "offsetDays" in item
        ? normalizeNullableNonNegativeInteger(item.offsetDays)
        : null;
    const sortOrder =
      "sortOrder" in item ? normalizeNonNegativeInteger(item.sortOrder) : index;
    const dueDate = normalizeNullableDate(item.dueDate);

    if (item.eventType === "installment" && installmentNumber === null) {
      return invalid("Parcela da regua exige numero maior que zero.");
    }

    if (percentage === null) {
      return invalid("Percentual da regua invalido.");
    }

    if (amount === null) {
      return invalid("Valor da regua invalido.");
    }

    if (offsetMonths === undefined) {
      return invalid("Offset em meses da regua invalido.");
    }

    if (offsetDays === undefined) {
      return invalid("Offset em dias da regua invalido.");
    }

    if (sortOrder === null) {
      return invalid("Ordenacao da regua invalida.");
    }

    if (dueDate === undefined) {
      return invalid("Vencimento da regua invalido.");
    }

    const key = `${item.eventType}:${installmentNumber ?? "event"}`;

    if (seenKeys.has(key)) {
      return invalid("Regua possui parcelas duplicadas.");
    }

    seenKeys.add(key);
    scheduleItems.push({
      amount,
      dueDate,
      eventType: item.eventType,
      installmentNumber,
      offsetDays,
      offsetMonths,
      percentage,
      sortOrder,
    });
  }

  return {
    ok: true as const,
    scheduleItems,
  };
}

function normalizeNonNegativeNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : null;
}

function normalizeNonNegativeInteger(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
    ? value
    : null;
}

function normalizeNullableNonNegativeInteger(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    return undefined;
  }

  return value;
}

function normalizeNullableDate(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return undefined;
  }

  return normalized;
}

function isPositiveNumber(value: number | null) {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function normalizeText(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function normalizeNullableText(value: unknown) {
  const normalized = normalizeText(value);

  return normalized || null;
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
