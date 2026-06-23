import { NextRequest, NextResponse } from "next/server";
import {
  createLeadProfile,
  getLeadProfile,
  updateLeadProfile,
} from "@/modules/crm/server/crm-lead-profiles-service";
import {
  isCrmLeadProfileCurrentMoment,
  isCrmLeadProfilePrimaryGoal,
  isCrmLeadProfileStrategicTopic,
  type CreateCrmLeadProfileInput,
  type UpdateCrmLeadProfileInput,
} from "@/modules/crm";

export async function GET(request: NextRequest) {
  const accessToken = readBearerToken(request);
  const leadId = request.nextUrl.searchParams.get("leadId")?.trim();

  if (!leadId) {
    return NextResponse.json(
      { error: "Informe o lead para consultar o perfil estrategico." },
      { status: 400 },
    );
  }

  const result = await getLeadProfile(accessToken, leadId);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ profile: result.profile });
}

export async function POST(request: NextRequest) {
  const accessToken = readBearerToken(request);
  const body = (await request.json().catch(() => null)) as Partial<
    CreateCrmLeadProfileInput
  > | null;

  const parsed = parseLeadProfilePayload(body);

  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const result = await createLeadProfile(accessToken, parsed.input);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ profile: result.profile }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const accessToken = readBearerToken(request);
  const body = (await request.json().catch(() => null)) as Partial<
    UpdateCrmLeadProfileInput
  > | null;

  const parsed = parseLeadProfilePayload(body);

  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const result = await updateLeadProfile(accessToken, parsed.input);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ profile: result.profile });
}

function readBearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  return authorization.slice("bearer ".length).trim() || null;
}

function parseLeadProfilePayload(
  body: Partial<CreateCrmLeadProfileInput> | null,
):
  | { ok: true; input: CreateCrmLeadProfileInput }
  | { error: string; ok: false } {
  if (!body?.leadId || typeof body.leadId !== "string") {
    return {
      error: "Informe o lead do perfil estrategico.",
      ok: false,
    };
  }

  if (
    body.primaryGoal !== undefined &&
    body.primaryGoal !== null &&
    !isCrmLeadProfilePrimaryGoal(body.primaryGoal)
  ) {
    return {
      error: "Objetivo principal invalido.",
      ok: false,
    };
  }

  if (
    body.currentMoment !== undefined &&
    body.currentMoment !== null &&
    !isCrmLeadProfileCurrentMoment(body.currentMoment)
  ) {
    return {
      error: "Momento atual invalido.",
      ok: false,
    };
  }

  if (
    body.strategicNotes !== undefined &&
    body.strategicNotes !== null &&
    typeof body.strategicNotes !== "string"
  ) {
    return {
      error: "Observacoes estrategicas invalidas.",
      ok: false,
    };
  }

  if (
    body.strategicTopics !== undefined &&
    !Array.isArray(body.strategicTopics)
  ) {
    return {
      error: "Temas relevantes invalidos.",
      ok: false,
    };
  }

  const strategicTopics = Array.isArray(body.strategicTopics)
    ? body.strategicTopics
    : [];

  if (strategicTopics.some((topic) => !isCrmLeadProfileStrategicTopic(topic))) {
    return {
      error: "Temas relevantes invalidos.",
      ok: false,
    };
  }

  return {
    input: {
      currentMoment: body.currentMoment ?? null,
      leadId: body.leadId,
      primaryGoal: body.primaryGoal ?? null,
      strategicNotes: body.strategicNotes ?? null,
      strategicTopics: Array.from(new Set(strategicTopics)),
    },
    ok: true,
  };
}
