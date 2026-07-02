import type { OperationsContractsResponse } from "./contracts-types";

export async function fetchOperationsContracts(accessToken: string) {
  const response = await fetch("/api/operations/contracts", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const payload = (await response.json().catch(() => null)) as
    | ({ error?: string } & Partial<OperationsContractsResponse>)
    | null;

  if (!response.ok || !payload?.summary || !Array.isArray(payload.contracts)) {
    throw new Error(
      payload?.error ?? "Nao foi possivel carregar os contratos operacionais.",
    );
  }

  return {
    contracts: payload.contracts,
    summary: payload.summary,
  };
}
