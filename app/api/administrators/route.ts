import { NextResponse, type NextRequest } from "next/server";
import {
  createAdministrator,
  listAdministrators,
} from "@/modules/administrators/server";
import {
  parseAdministratorCreateInput,
  parseAdministratorListFilters,
} from "@/modules/administrators/validation";

export async function GET(request: NextRequest) {
  const parsedFilters = parseAdministratorListFilters(
    request.nextUrl.searchParams,
  );

  if (!parsedFilters.ok) {
    return NextResponse.json(
      { error: parsedFilters.error },
      { status: parsedFilters.status },
    );
  }

  const result = await listAdministrators(
    readBearerToken(request),
    parsedFilters.filters,
  );

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }

  return NextResponse.json({ administrators: result.administrators });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsedInput = parseAdministratorCreateInput(body);

  if (!parsedInput.ok) {
    return NextResponse.json(
      { error: parsedInput.error },
      { status: parsedInput.status },
    );
  }

  const result = await createAdministrator(
    readBearerToken(request),
    parsedInput.input,
  );

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }

  return NextResponse.json(
    { administrator: result.administrator },
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
