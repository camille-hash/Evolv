import { NextResponse, type NextRequest } from "next/server";
import { registerContractBidResult } from "@/modules/operations/contract-timeline-server";
import type { RegisterBidResultInput } from "@/modules/operations/contract-timeline-types";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ bidId: string; contractId: string }> },
) {
  const { bidId, contractId } = await context.params;
  const body = (await request.json().catch(() => null)) as
    | RegisterBidResultInput
    | null;
  if (!body) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }
  const result = await registerContractBidResult(
    token(request),
    contractId,
    bidId,
    body,
  );
  return result.ok
    ? NextResponse.json({ timeline: result.timeline })
    : NextResponse.json({ error: result.error }, { status: result.status });
}

function token(request: NextRequest) {
  const value = request.headers.get("authorization");
  return value?.toLowerCase().startsWith("bearer ")
    ? value.slice(7).trim() || null
    : null;
}
