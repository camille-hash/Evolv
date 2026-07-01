import { NextResponse, type NextRequest } from "next/server";

import {
  listDecisionOutputsServerSide,
  type DecisionOutputIndexParams,
} from "@/modules/decision-observatory";

export async function GET(request: NextRequest) {
  const accessToken = readBearerToken(request);
  const result = await listDecisionOutputsServerSide(
    accessToken,
    readIndexParams(request),
  );

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }

  return NextResponse.json(result.response);
}

function readIndexParams(request: NextRequest): DecisionOutputIndexParams {
  const params = request.nextUrl.searchParams;

  return {
    confidenceMax: params.get("confidenceMax"),
    confidenceMin: params.get("confidenceMin"),
    dateFrom: params.get("dateFrom"),
    dateTo: params.get("dateTo"),
    leadQuery: params.get("leadQuery"),
    modelId: params.get("modelId"),
    modelVersion: params.get("modelVersion"),
    organizationId: params.get("organizationId"),
    page: params.get("page"),
    pageSize: params.get("pageSize"),
    period: params.get("period") as DecisionOutputIndexParams["period"],
    scoreMax: params.get("scoreMax"),
    scoreMin: params.get("scoreMin"),
    sortBy: params.get("sortBy") as DecisionOutputIndexParams["sortBy"],
    sortDirection: params.get(
      "sortDirection",
    ) as DecisionOutputIndexParams["sortDirection"],
  };
}

function readBearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  return authorization.slice("bearer ".length).trim() || null;
}
