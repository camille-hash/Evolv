import { NextResponse, type NextRequest } from "next/server";
import { listPortfolioClients } from "@/modules/portfolio/server";

export async function GET(request: NextRequest) {
  const accessToken = readBearerToken(request);
  const result = await listPortfolioClients(accessToken, {
    limit: parsePositiveInteger(request.nextUrl.searchParams.get("limit")),
    offset: parseNonNegativeInteger(request.nextUrl.searchParams.get("offset")),
    search: request.nextUrl.searchParams.get("search"),
    status: request.nextUrl.searchParams.get("status"),
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }

  return NextResponse.json({ clients: result.clients });
}

function readBearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  return authorization.slice("bearer ".length).trim() || null;
}

function parsePositiveInteger(value: string | null) {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function parseNonNegativeInteger(value: string | null) {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed >= 0 ? parsed : undefined;
}
