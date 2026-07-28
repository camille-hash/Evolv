import { NextResponse, type NextRequest } from "next/server";
import {
  listContractBidOffers,
  saveContractBidOffer,
} from "@/modules/operations/contract-bid-offer-server";

type Context = { params: Promise<{ contractId: string }> };

export async function GET(request: NextRequest, context: Context) {
  const { contractId } = await context.params;
  return respond(await listContractBidOffers(token(request), contractId));
}

export async function POST(request: NextRequest, context: Context) {
  const { contractId } = await context.params;
  const input = await request.json().catch(() => null);
  return respond(await saveContractBidOffer(token(request), contractId, input));
}

function token(request: NextRequest) {
  const value = request.headers.get("authorization");
  return value?.toLowerCase().startsWith("bearer ")
    ? value.slice(7).trim() || null
    : null;
}
function respond(
  result:
    | Awaited<ReturnType<typeof listContractBidOffers>>
    | Awaited<ReturnType<typeof saveContractBidOffer>>,
) {
  return NextResponse.json(
    result.ok ? result : { error: result.error },
    { status: result.ok ? 200 : result.status },
  );
}
