import { NextResponse, type NextRequest } from "next/server";
import { convertLeadToClient } from "@/modules/clients/server";

type RouteContext = {
  params: Promise<{
    leadId: string;
  }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const accessToken = readBearerToken(request);
    const { leadId } = await context.params;

    logLeadConversionRouteDebug("route_entered", {
      hasBearerToken: Boolean(accessToken),
      leadId,
      pathname: request.nextUrl.pathname,
    });

    const result = await convertLeadToClient(accessToken, leadId);

    if (!result.ok) {
      logLeadConversionRouteDebug("returned_response", {
        error: result.error,
        leadId,
        ok: false,
        status: result.status,
      });

      return NextResponse.json(
        { error: result.error },
        { status: result.status },
      );
    }

    logLeadConversionRouteDebug("returned_response", {
      clientId: result.client.id,
      created: result.created,
      leadId: result.lead.id,
      ok: true,
      status: 200,
    });

    return NextResponse.json({
      client: result.client,
      created: result.created,
      lead: result.lead,
    });
  } catch (error) {
    const normalizedError = normalizeRouteError(error);

    logLeadConversionRouteDebug("caught_exception", normalizedError);

    return NextResponse.json(
      {
        error: normalizedError.message,
        exception: normalizedError,
      },
      { status: 500 },
    );
  }
}

function readBearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  return authorization.slice("bearer ".length).trim() || null;
}

function logLeadConversionRouteDebug(
  stage: string,
  payload: Record<string, unknown>,
) {
  if (stage === "caught_exception") {
    console.error("[EVOLV clients]", {
      ...payload,
      stage,
    });
    return;
  }

  console.info("[EVOLV clients]", {
    ...payload,
    stage,
  });
}

function normalizeRouteError(error: unknown) {
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      stack: error.stack,
    };
  }

  return {
    message: String(error),
    name: "UnknownError",
    stack: null,
  };
}
