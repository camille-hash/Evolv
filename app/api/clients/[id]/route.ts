import { NextResponse, type NextRequest } from "next/server";
import { getClientById } from "@/modules/clients/server";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  logClientsRouteDebug("route_entered", {
    clientId: id,
    pathname: request.nextUrl.pathname,
  });

  const result = await getClientById(readBearerToken(request), id);

  if (!result.ok) {
    logClientsRouteDebug("returned_response", {
      clientId: id,
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
    clientId: result.client.id,
    ok: true,
    status: 200,
  });

  return NextResponse.json({
    client: result.client,
    contracts: result.contracts,
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
