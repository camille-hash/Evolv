import { NextResponse, type NextRequest } from "next/server";
import { searchOperationsWorkspace } from "@/modules/operations/search-server";

export async function GET(request: NextRequest) {
  const accessToken = readBearerToken(request);
  const query = request.nextUrl.searchParams.get("q") ?? "";
  const result = await searchOperationsWorkspace(accessToken, query);

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }

  return NextResponse.json({
    groups: result.groups,
    query: result.query,
    totalResults: result.totalResults,
  });
}

function readBearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  return authorization.slice("bearer ".length).trim() || null;
}
