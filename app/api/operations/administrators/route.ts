import { NextResponse, type NextRequest } from "next/server";
import { listOperationsAdministrators } from "@/modules/operations/administrators-server";

export async function GET(request: NextRequest) {
  const accessToken = readBearerToken(request);
  const result = await listOperationsAdministrators(accessToken);

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }

  return NextResponse.json({
    administrators: result.administrators,
    summary: result.summary,
  });
}

function readBearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  return authorization.slice("bearer ".length).trim() || null;
}
