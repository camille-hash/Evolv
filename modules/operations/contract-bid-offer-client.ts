import { readSupabaseAccessToken } from "@/modules/access/supabase-session-token";
import type {
  ContractBidOffer,
  ContractBidOfferChannel,
  ContractBidOfferStatus,
  SaveContractBidOfferInput,
} from "./contract-bid-offer-types";

export async function fetchContractBidOffers(contractId: string) {
  const payload = await request<{ offers: ContractBidOffer[] }>(
    `/api/operations/contracts/${encodeURIComponent(contractId)}/bid-offers`,
  );
  return payload.offers;
}

export async function saveContractBidOfferClient(
  contractId: string,
  input: SaveContractBidOfferInput,
) {
  return request<{ offer: ContractBidOffer }>(
    `/api/operations/contracts/${encodeURIComponent(contractId)}/bid-offers`,
    { body: JSON.stringify(input), method: "POST" },
  ).then((payload) => payload.offer);
}

export async function generateContractBidOfferClient(
  contractId: string,
  offerId: string,
) {
  return request<{ offer: ContractBidOffer }>(
    path(contractId, offerId, "generate"),
    { method: "POST" },
  ).then((payload) => payload.offer);
}

export async function transitionContractBidOfferClient(
  contractId: string,
  offerId: string,
  status: ContractBidOfferStatus,
  channel?: ContractBidOfferChannel,
) {
  return request<{ offer: ContractBidOffer }>(
    path(contractId, offerId, "transition"),
    { body: JSON.stringify({ channel, status }), method: "POST" },
  ).then((payload) => payload.offer);
}

export async function accessContractBidOfferPdf(
  contractId: string,
  offerId: string,
  download = false,
) {
  return request<{ fileName: string; url: string }>(
    `${path(contractId, offerId, "access")}?download=${download}`,
  );
}

function path(contractId: string, offerId: string, action: string) {
  return `/api/operations/contracts/${encodeURIComponent(contractId)}/bid-offers/${encodeURIComponent(offerId)}/${action}`;
}

async function request<T>(url: string, init: RequestInit = {}) {
  const token = await readSupabaseAccessToken();
  if (!token) throw new Error("Sessao expirada.");
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  const payload = (await response.json().catch(() => null)) as
    | (T & { error?: string })
    | null;
  if (!response.ok || !payload)
    throw new Error(payload?.error ?? "Nao foi possivel operar a oferta.");
  return payload;
}
