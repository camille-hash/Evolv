import { NextResponse, type NextRequest } from "next/server";
import { getPortfolioSummary } from "@/modules/portfolio/server";

export async function GET(request: NextRequest) {
  const accessToken = readBearerToken(request);
  const result = await getPortfolioSummary(accessToken);

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }

  return NextResponse.json({
    byAdministrator: result.byAdministrator,
    byStatus: result.byStatus,
    summary: result.summary,
    topClients: result.topClients,
  });
}

function readBearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  return authorization.slice("bearer ".length).trim() || null;
}
