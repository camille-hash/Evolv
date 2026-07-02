import { NextResponse, type NextRequest } from "next/server";
import { listClients } from "@/modules/clients/server";

export async function GET(request: NextRequest) {
  const result = await listClients(
    readBearerToken(request),
    parseClientListFilters(request.nextUrl.searchParams),
  );

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }

  return NextResponse.json({ clients: result.clients });
}

function parseClientListFilters(params: URLSearchParams) {
  return {
    limit: parsePositiveInteger(params.get("limit")),
    offset: parseNonNegativeInteger(params.get("offset")),
    search: params.get("search"),
    status: params.get("status"),
  };
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

function readBearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  return authorization.slice("bearer ".length).trim() || null;
}
