import { NextResponse, type NextRequest } from "next/server";
import { registerContractAssembly } from "@/modules/operations/contract-timeline-server";
import type { RegisterAssemblyInput } from "@/modules/operations/contract-timeline-types";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ contractId: string }> },
) {
  const { contractId } = await context.params;
  const body = (await request.json().catch(() => null)) as
    | RegisterAssemblyInput
    | null;
  if (!body) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }
  const result = await registerContractAssembly(token(request), contractId, body);
  return result.ok
    ? NextResponse.json({ timeline: result.timeline }, { status: 201 })
    : NextResponse.json({ error: result.error }, { status: result.status });
}

function token(request: NextRequest) {
  const value = request.headers.get("authorization");
  return value?.toLowerCase().startsWith("bearer ")
    ? value.slice(7).trim() || null
    : null;
}
