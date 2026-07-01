import { NextResponse, type NextRequest } from "next/server";

import { runDecisionReplayServerSide } from "@/modules/decision-observatory";

export async function POST(request: NextRequest) {
  const payload = await readJsonPayload(request);
  const result = await runDecisionReplayServerSide(readBearerToken(request), {
    outputId: readPayloadString(payload, "outputId"),
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }

  return NextResponse.json(result.report);
}

async function readJsonPayload(request: NextRequest) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function readPayloadString(value: unknown, key: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const field = (value as Record<string, unknown>)[key];

  return typeof field === "string" ? field : null;
}

function readBearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  return authorization.slice("bearer ".length).trim() || null;
}
