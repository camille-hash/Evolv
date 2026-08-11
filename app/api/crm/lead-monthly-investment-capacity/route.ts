import { NextResponse, type NextRequest } from "next/server";

import { getLeadMonthlyInvestmentCapacity } from "@/modules/crm/server/lead-monthly-investment-capacity-service";

export async function GET(request: NextRequest) {
  const leadId = request.nextUrl.searchParams.get("leadId")?.trim();

  if (!leadId) {
    return NextResponse.json(
      { error: "Informe o lead para consultar a capacidade mensal." },
      { status: 400 },
    );
  }

  const result = await getLeadMonthlyInvestmentCapacity(
    readBearerToken(request),
    leadId,
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    monthlyInvestmentCapacity: result.monthlyInvestmentCapacity,
  });
}

function readBearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  return authorization.slice("bearer ".length).trim() || null;
}
