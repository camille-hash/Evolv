import { NextResponse, type NextRequest } from "next/server";
import { parseMaterializeApprovedCommercialProposalInput } from "@/modules/contracts/materialization-command";
import { materializeApprovedCommercialProposal } from "@/modules/contracts/materialization-server";

export async function POST(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  const token = authorization?.toLowerCase().startsWith("bearer ")
    ? authorization.slice("bearer ".length).trim() || null : null;
  const input = parseMaterializeApprovedCommercialProposalInput(await request.json().catch(() => null));
  if (!input) return NextResponse.json({ error: "MAT_INVALID_PAYLOAD" }, { status: 400 });
  const result = await materializeApprovedCommercialProposal(token, input);
  if (!result.ok) return NextResponse.json({ error: result.code }, { status: result.status });
  return NextResponse.json({ result: result.result }, { status: result.result.outcome === "created" ? 201 : 200 });
}
