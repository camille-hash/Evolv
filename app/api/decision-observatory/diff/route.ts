import { NextResponse, type NextRequest } from "next/server";

import { compareDecisionOutputsServerSide } from "@/modules/decision-observatory";

export async function GET(request: NextRequest) {
  const result = await compareDecisionOutputsServerSide(
    readBearerToken(request),
    {
      currentOutputId: request.nextUrl.searchParams.get("currentOutputId"),
      previousOutputId: request.nextUrl.searchParams.get("previousOutputId"),
    },
  );

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }

  return NextResponse.json(result.response);
}

function readBearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  return authorization.slice("bearer ".length).trim() || null;
}
