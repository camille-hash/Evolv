import { NextResponse, type NextRequest } from "next/server";
import { createContractBidOfferAccess } from "@/modules/operations/contract-bid-offer-server";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ contractId: string; offerId: string }> },
) {
  const { contractId, offerId } = await context.params;
  const authorization = request.headers.get("authorization");
  const token = authorization?.toLowerCase().startsWith("bearer ")
    ? authorization.slice(7).trim() || null
    : null;
  const result = await createContractBidOfferAccess(
    token,
    contractId,
    offerId,
    request.nextUrl.searchParams.get("download") === "true",
  );
  return NextResponse.json(result.ok ? result : { error: result.error }, {
    status: result.ok ? 200 : result.status,
  });
}
