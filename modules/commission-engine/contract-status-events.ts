const contractStatusCommissionEventMap = {
  active: "contract_signed",
} as const;

export function resolveCommissionEventTypeForContractStatus(
  status: string | null | undefined,
) {
  const normalizedStatus = status?.trim();

  if (!normalizedStatus) {
    return null;
  }

  return contractStatusCommissionEventMap[
    normalizedStatus as keyof typeof contractStatusCommissionEventMap
  ] ?? null;
}
