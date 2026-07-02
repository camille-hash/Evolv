import type { RevenueGenerationMode } from "./types";

export function parseRevenueGenerationInput(value: unknown) {
  if (value === null || value === undefined) {
    return {
      input: {
        mode: "create_missing" as RevenueGenerationMode,
      },
      ok: true as const,
    };
  }

  if (!isRecord(value)) {
    return invalid("Informe os dados de geracao de receita.");
  }

  if (!("mode" in value) || value.mode === undefined || value.mode === null) {
    return {
      input: {
        mode: "create_missing" as RevenueGenerationMode,
      },
      ok: true as const,
    };
  }

  if (!isRevenueGenerationMode(value.mode)) {
    return invalid("Modo de geracao de receita invalido.");
  }

  return {
    input: {
      mode: value.mode,
    },
    ok: true as const,
  };
}

export function isRevenueGenerationMode(
  value: unknown,
): value is RevenueGenerationMode {
  return value === "create_missing" || value === "replace_expected";
}

export function validateRevenueContractInput(input: {
  commissionPlanId: string | null;
  creditAmount: number;
}) {
  if (!input.commissionPlanId) {
    return invalid("Contrato nao possui plano de comissao.");
  }

  if (!Number.isFinite(input.creditAmount) || input.creditAmount < 0) {
    return invalid("Valor de credito do contrato invalido.");
  }

  return {
    ok: true as const,
  };
}

export function validateRevenueCommissionPlanInput(input: {
  paymentInstallments: number;
}) {
  if (
    !Number.isInteger(input.paymentInstallments) ||
    input.paymentInstallments < 1
  ) {
    return invalid("Parcelamento do plano de comissao invalido.");
  }

  return {
    ok: true as const,
  };
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
