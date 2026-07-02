import { NextResponse, type NextRequest } from "next/server";
import {
  createContractFromLead,
  parseLeadContractInput,
} from "@/modules/contracts/lead-contract-operation";

type RouteContext = {
  params: Promise<{
    leadId: string;
  }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const accessToken = readBearerToken(request);
  const { leadId } = await context.params;
  const body = await request.json().catch(() => null);
  const parsedInput = parseLeadContractInput(body);

  if (!parsedInput.ok) {
    return NextResponse.json(
      { error: parsedInput.error },
      { status: parsedInput.status },
    );
  }

  const result = await createContractFromLead(
    accessToken,
    leadId,
    parsedInput.input,
  );

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }

  return NextResponse.json(
    {
      client: result.client,
      contract: result.contract,
      lead: result.lead,
    },
    { status: 201 },
  );
}

function readBearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  return authorization.slice("bearer ".length).trim() || null;
}
