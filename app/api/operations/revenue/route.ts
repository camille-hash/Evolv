import { NextResponse, type NextRequest } from "next/server";
import {
  listOperationsRevenue,
  parseOperationsRevenueQuery,
} from "@/modules/operations/revenue-server";

export async function GET(request: NextRequest) {
  const accessToken = readBearerToken(request);
  const parsedQuery = parseOperationsRevenueQuery(request.nextUrl.searchParams);

  if (!parsedQuery.ok) {
    return NextResponse.json(
      { error: parsedQuery.error },
      { status: parsedQuery.status },
    );
  }

  const result = await listOperationsRevenue(accessToken, parsedQuery.input);

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }

  return NextResponse.json({
    dailyPanel: result.dailyPanel,
    entries: result.entries,
    filters: result.filters,
    pagination: result.pagination,
    summary: result.summary,
  });
}

function readBearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  return authorization.slice("bearer ".length).trim() || null;
}
