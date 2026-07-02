import { NextResponse, type NextRequest } from "next/server";
import { listOperationsTimeline } from "@/modules/operations/timeline-server";

export async function GET(request: NextRequest) {
  const accessToken = readBearerToken(request);
  const result = await listOperationsTimeline(accessToken);

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }

  return NextResponse.json({
    items: result.items,
  });
}

function readBearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  return authorization.slice("bearer ".length).trim() || null;
}
