import { NextResponse, type NextRequest } from "next/server";
import { getProposalMaterializationExperience } from "@/modules/contracts/materialization-experience-server";

export async function GET(request: NextRequest) {
  const proposalId = request.nextUrl.searchParams.get("proposalId")?.trim();
  if (!proposalId) return NextResponse.json({ error: "Informe a proposta." }, { status: 400 });
  const authorization = request.headers.get("authorization");
  const token = authorization?.toLowerCase().startsWith("bearer ") ? authorization.slice(7).trim() : null;
  const result = await getProposalMaterializationExperience(token, proposalId);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ experience: result.experience });
}
