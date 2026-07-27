import { NextResponse, type NextRequest } from "next/server";
import { listContractOperationalTimeline } from "@/modules/operations/contract-timeline-server";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ contractId: string }> },
) {
  const { contractId } = await context.params;
  const result = await listContractOperationalTimeline(token(request), contractId);
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
