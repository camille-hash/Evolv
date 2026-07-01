import { NextResponse, type NextRequest } from "next/server";

import {
  listDecisionTimelineServerSide,
  type DecisionTimelineParams,
} from "@/modules/decision-observatory";

export async function GET(request: NextRequest) {
  const result = await listDecisionTimelineServerSide(
    readBearerToken(request),
    readTimelineParams(request),
  );

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }

  return NextResponse.json(result.response);
}

function readTimelineParams(request: NextRequest): DecisionTimelineParams {
  const params = request.nextUrl.searchParams;

  return {
    dateFrom: params.get("dateFrom"),
    dateTo: params.get("dateTo"),
    leadId: params.get("leadId"),
    limit: params.get("limit"),
    modelId: params.get("modelId"),
    modelVersion: params.get("modelVersion"),
  };
}

function readBearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  return authorization.slice("bearer ".length).trim() || null;
}
