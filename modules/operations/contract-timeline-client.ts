import { requireSupabaseAccessToken } from "@/modules/access/supabase-session-token";
import type {
  ContractOperationalTimeline,
  RegisterAssemblyInput,
  RegisterBidInput,
  RegisterBidResultInput,
} from "./contract-timeline-types";

export function fetchContractOperationalTimeline(contractId: string) {
  return requestTimeline(`/api/operations/contracts/${contractId}/timeline`);
}

export function createContractAssembly(
  contractId: string,
  input: RegisterAssemblyInput,
) {
  return requestTimeline(
    `/api/operations/contracts/${contractId}/assemblies`,
    "POST",
    input,
  );
}

export function createContractBid(contractId: string, input: RegisterBidInput) {
  return requestTimeline(
    `/api/operations/contracts/${contractId}/bids`,
    "POST",
    input,
  );
}

export function saveContractBidResult(
  contractId: string,
  bidId: string,
  input: RegisterBidResultInput,
) {
  return requestTimeline(
    `/api/operations/contracts/${contractId}/bids/${bidId}/result`,
    "POST",
    input,
  );
}

async function requestTimeline(
  url: string,
  method = "GET",
  body?: unknown,
): Promise<ContractOperationalTimeline> {
  const token = await requireSupabaseAccessToken(
    "Sessão inválida para operar a Timeline do contrato.",
  );
  const response = await fetch(url, {
    body: body ? JSON.stringify(body) : undefined,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    method,
  });
  const payload = (await response.json().catch(() => null)) as
    | { error?: string; timeline?: ContractOperationalTimeline }
    | null;
  if (!response.ok || !payload?.timeline) {
    throw new Error(
      payload?.error ?? "Não foi possível operar a Timeline do contrato.",
    );
  }
  return payload.timeline;
}
