import { NextResponse, type NextRequest } from "next/server";
import { listClientRevenue } from "@/modules/revenue/server";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const accessToken = readBearerToken(request);
  const { id } = await context.params;
  const result = await listClientRevenue(accessToken, id);

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }

  return NextResponse.json({ revenueEntries: result.revenueEntries });
}

function readBearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  return authorization.slice("bearer ".length).trim() || null;
}
