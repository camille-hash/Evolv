import { NextResponse, type NextRequest } from "next/server";
import {
  getContractById,
  updateContract,
} from "@/modules/contracts/server";
import { parseContractInput } from "@/modules/contracts/validation";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const accessToken = readBearerToken(request);
  const { id } = await context.params;
  const result = await getContractById(accessToken, id);

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }

  return NextResponse.json({ contract: result.contract });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const accessToken = readBearerToken(request);
  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const parsedInput = parseContractInput(body);

  if (!parsedInput.ok) {
    return NextResponse.json(
      { error: parsedInput.error },
      { status: parsedInput.status },
    );
  }

  const result = await updateContract(accessToken, id, parsedInput.input);

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }

  return NextResponse.json({ contract: result.contract });
}

function readBearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  return authorization.slice("bearer ".length).trim() || null;
}
