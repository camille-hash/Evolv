import { NextResponse, type NextRequest } from "next/server";
import {
  maybeActivateCommissionEngineForContractStatusTransition,
  updateContractStatus,
} from "@/modules/contracts/server";
import { parseContractStatusInput } from "@/modules/contracts/validation";
import { maybeGenerateRevenueForContractStatus } from "@/modules/revenue/server";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const accessToken = readBearerToken(request);
  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const parsedInput = parseContractStatusInput(body);

  if (!parsedInput.ok) {
    return NextResponse.json(
      { error: parsedInput.error },
      { status: parsedInput.status },
    );
  }

  const result = await updateContractStatus(
    accessToken,
    id,
    parsedInput.input,
  );

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }

  await maybeGenerateRevenueForContractStatus(accessToken, id).catch(() => {
    // Revenue generation is a secondary side effect and must not block status updates.
  });

  await maybeActivateCommissionEngineForContractStatusTransition(accessToken, {
    contract: result.contract,
    previousStatus: result.previousStatus ?? result.contract.status,
  }).catch(() => {
    // Commission Engine activation is a secondary side effect and must not block status updates.
  });

  return NextResponse.json({
    contract: result.contract,
    warning: result.operationalWarning ?? null,
  });
}

function readBearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  return authorization.slice("bearer ".length).trim() || null;
}
