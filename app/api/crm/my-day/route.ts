import { NextResponse, type NextRequest } from "next/server";
import { getCrmMyDay } from "@/modules/crm/server/crm-my-day-service";

export async function GET(request: NextRequest) {
  const result = await getCrmMyDay(readBearerToken(request));

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }

  return NextResponse.json({ myDay: result.myDay });
}

function readBearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  return authorization.slice("bearer ".length).trim() || null;
}
