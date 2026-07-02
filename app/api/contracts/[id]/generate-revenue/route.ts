import { NextResponse, type NextRequest } from "next/server";
import { generateRevenueForContract } from "@/modules/revenue/server";
import { parseRevenueGenerationInput } from "@/modules/revenue/validation";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const accessToken = readBearerToken(request);
  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const parsedInput = parseRevenueGenerationInput(body);

  if (!parsedInput.ok) {
    return NextResponse.json(
      { error: parsedInput.error },
      { status: parsedInput.status },
    );
  }

  const result = await generateRevenueForContract(
    accessToken,
    id,
    parsedInput.input.mode,
  );

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }

  return NextResponse.json({
    createdEntries: result.createdEntries,
    existingEntries: result.existingEntries,
    skippedReason: result.skippedReason,
  });
}

function readBearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  return authorization.slice("bearer ".length).trim() || null;
}
