import { NextResponse, type NextRequest } from "next/server";
import { listClients } from "@/modules/clients/server";

export async function GET(request: NextRequest) {
  logClientsRouteDebug("route_entered", {
    pathname: request.nextUrl.pathname,
    search: request.nextUrl.search,
  });

  const result = await listClients(
    readBearerToken(request),
    parseClientListFilters(request.nextUrl.searchParams),
  );

  if (!result.ok) {
    logClientsRouteDebug("returned_response", {
      error: result.error,
      ok: false,
      status: result.status,
    });

    return NextResponse.json(
      createErrorPayload(result.error, result.details),
      { status: result.status },
    );
  }

  logClientsRouteDebug("returned_response", {
    clients: result.clients.length,
    ok: true,
    status: 200,
  });

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

function createErrorPayload(error: string, details: unknown) {
  if (process.env.NODE_ENV === "production") {
    return { error };
  }

  return { details, error };
}

function logClientsRouteDebug(stage: string, payload: Record<string, unknown>) {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  console.info("[EVOLV clients]", {
    ...payload,
    stage,
  });
}
