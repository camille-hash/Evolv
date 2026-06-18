import { NextResponse, type NextRequest } from "next/server";
import { getLeadTimeline } from "@/modules/crm/server/crm-timeline-service";

export async function GET(request: NextRequest) {
  const accessToken = readBearerToken(request);
  const leadId = request.nextUrl.searchParams.get("leadId")?.trim();

  if (!leadId) {
    return NextResponse.json(
      { error: "Informe o lead para consultar a timeline." },
      { status: 400 },
    );
  }

  const result = await getLeadTimeline(accessToken, leadId);

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }

  return NextResponse.json({ timeline: result.timeline });
}

function readBearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  return authorization.slice("bearer ".length).trim() || null;
}
