import { NextResponse, type NextRequest } from "next/server";
import { convertLeadToClient } from "@/modules/clients/server";

type RouteContext = {
  params: Promise<{
    leadId: string;
  }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const accessToken = readBearerToken(request);
  const { leadId } = await context.params;
  const result = await convertLeadToClient(accessToken, leadId);

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }

  return NextResponse.json({
    client: result.client,
    created: result.created,
    lead: result.lead,
  });
}

function readBearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  return authorization.slice("bearer ".length).trim() || null;
}
