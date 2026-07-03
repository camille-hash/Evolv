import { NextResponse, type NextRequest } from "next/server";
import { createExpectedRevenueForContract } from "@/modules/revenue/server";
import { parseExpectedRevenueInput } from "@/modules/revenue/validation";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const accessToken = readBearerToken(request);
  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const parsedInput = parseExpectedRevenueInput(body);

  if (!parsedInput.ok) {
    return NextResponse.json(
      { error: parsedInput.error },
      { status: parsedInput.status },
    );
  }

  const result = await createExpectedRevenueForContract(
    accessToken,
    id,
    parsedInput.input,
  );

  if (!result.ok) {
    logExpectedRevenueRouteError("create_failed", {
      contractId: id,
      error: result.error,
      status: result.status,
    });

    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }

  return NextResponse.json(
    { revenueEntry: result.revenueEntry },
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

function logExpectedRevenueRouteError(
  stage: string,
  payload: Record<string, unknown>,
) {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  console.error("[EVOLV revenue]", {
    ...payload,
    stage,
  });
}
