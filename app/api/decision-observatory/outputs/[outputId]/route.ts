import { NextResponse, type NextRequest } from "next/server";

import { inspectDecisionOutputByIdServerSide } from "@/modules/decision-observatory";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ outputId: string }> },
) {
  const accessToken = readBearerToken(request);
  const { outputId } = await context.params;
  const result = await inspectDecisionOutputByIdServerSide(
    accessToken,
    outputId,
  );

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }

  return NextResponse.json({ inspection: result.inspection });
}

function readBearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  return authorization.slice("bearer ".length).trim() || null;
}
