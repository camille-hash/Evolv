import { NextResponse, type NextRequest } from "next/server";

import { buildExecutiveSituationFromLatestCommercialAttentionServerSide } from "@/modules/decision-models/dm001-executive-situation-service";
import { mapCommercialAttentionDecisionToProductSurface } from "@/modules/decision-models/dm001-product-surface";

export async function GET(request: NextRequest) {
  const accessToken = readBearerToken(request);
  const leadId = request.nextUrl.searchParams.get("leadId")?.trim();

  if (!leadId) {
    return NextResponse.json(
      { error: "Informe o lead para consultar atencao comercial." },
      { status: 400 },
    );
  }

  const result =
    await buildExecutiveSituationFromLatestCommercialAttentionServerSide(
      accessToken,
      {
        leadId,
      },
    );

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }

  return NextResponse.json({
    decision: mapCommercialAttentionDecisionToProductSurface(
      result.latestDecision,
    ),
    executiveSituation: result.executiveSituation,
  });
}

function readBearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  return authorization.slice("bearer ".length).trim() || null;
}
