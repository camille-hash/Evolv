import { NextResponse, type NextRequest } from "next/server";
import {
  createContract,
  listContracts,
} from "@/modules/contracts/server";
import {
  parseContractInput,
  parseContractListFilters,
} from "@/modules/contracts/validation";

export async function GET(request: NextRequest) {
  const accessToken = readBearerToken(request);
  const parsedFilters = parseContractListFilters(request.nextUrl.searchParams);

  if (!parsedFilters.ok) {
    return NextResponse.json(
      { error: parsedFilters.error },
      { status: parsedFilters.status },
    );
  }

  const result = await listContracts(accessToken, parsedFilters.filters);

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }

  return NextResponse.json({ contracts: result.contracts });
}

export async function POST(request: NextRequest) {
  const accessToken = readBearerToken(request);
  const body = await request.json().catch(() => null);
  const parsedInput = parseContractInput(body);

  if (!parsedInput.ok) {
    return NextResponse.json(
      { error: parsedInput.error },
      { status: parsedInput.status },
    );
  }

  const result = await createContract(accessToken, parsedInput.input);

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }

  return NextResponse.json({ contract: result.contract }, { status: 201 });
}

function readBearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  return authorization.slice("bearer ".length).trim() || null;
}
