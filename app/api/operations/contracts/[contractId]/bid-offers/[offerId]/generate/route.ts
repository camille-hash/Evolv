import { NextResponse, type NextRequest } from "next/server";
import { generateContractBidOffer } from "@/modules/operations/contract-bid-offer-server";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ contractId: string; offerId: string }> },
) {
  const { contractId, offerId } = await context.params;
  const authorization = request.headers.get("authorization");
  const token = authorization?.toLowerCase().startsWith("bearer ")
    ? authorization.slice(7).trim() || null
    : null;
  const result = await generateContractBidOffer(token, contractId, offerId);
  return NextResponse.json(result.ok ? result : { error: result.error }, {
    status: result.ok ? 200 : result.status,
  });
}
