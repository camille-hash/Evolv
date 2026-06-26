import { NextRequest, NextResponse } from "next/server";
import {
  archiveEvidence,
  createEvidence,
  listEvidenceByKnowledge,
} from "@/modules/crm/server/knowledge-evidence-service";
import {
  isKnowledgeEvidenceType,
  type CreateKnowledgeEvidenceInput,
} from "@/modules/crm";

export async function GET(request: NextRequest) {
  const accessToken = readBearerToken(request);
  const knowledgeItemId = request.nextUrl.searchParams
    .get("knowledgeItemId")
    ?.trim();

  if (!knowledgeItemId) {
    return NextResponse.json(
      { error: "Informe o conhecimento." },
      { status: 400 },
    );
  }

  const result = await listEvidenceByKnowledge(accessToken, knowledgeItemId);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ evidence: result.evidence });
}

export async function POST(request: NextRequest) {
  const accessToken = readBearerToken(request);
  const body = (await request.json().catch(() => null)) as Partial<
    CreateKnowledgeEvidenceInput
  > | null;

  const parsed = parseCreateEvidencePayload(body);

  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const result = await createEvidence(accessToken, parsed.input);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ evidence: result.evidence }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const accessToken = readBearerToken(request);
  const body = (await request.json().catch(() => null)) as {
    evidenceId?: unknown;
  } | null;

  if (typeof body?.evidenceId !== "string" || !body.evidenceId.trim()) {
    return NextResponse.json(
      { error: "Informe a evidencia." },
      { status: 400 },
    );
  }

  const result = await archiveEvidence(accessToken, body.evidenceId);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ evidence: result.evidence });
}

function readBearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  return authorization.slice("bearer ".length).trim() || null;
}

function parseCreateEvidencePayload(
  body: Partial<CreateKnowledgeEvidenceInput> | null,
):
  | { input: CreateKnowledgeEvidenceInput; ok: true }
  | { error: string; ok: false } {
  if (!body?.knowledgeItemId || typeof body.knowledgeItemId !== "string") {
    return {
      error: "Informe o conhecimento.",
      ok: false,
    };
  }

  if (!body.title || typeof body.title !== "string" || !body.title.trim()) {
    return {
      error: "Titulo da evidencia e obrigatorio.",
      ok: false,
    };
  }

  if (!isKnowledgeEvidenceType(body.evidenceType)) {
    return {
      error: "Tipo de evidencia invalido.",
      ok: false,
    };
  }

  if (
    body.summary !== undefined &&
    body.summary !== null &&
    typeof body.summary !== "string"
  ) {
    return {
      error: "Resumo invalido.",
      ok: false,
    };
  }

  if (
    body.source !== undefined &&
    body.source !== null &&
    typeof body.source !== "string"
  ) {
    return {
      error: "Fonte invalida.",
      ok: false,
    };
  }

  if (
    body.sourceReference !== undefined &&
    body.sourceReference !== null &&
    typeof body.sourceReference !== "string"
  ) {
    return {
      error: "Referencia invalida.",
      ok: false,
    };
  }

  return {
    input: {
      evidenceType: body.evidenceType,
      knowledgeItemId: body.knowledgeItemId,
      source: body.source ?? "Manual",
      sourceReference: body.sourceReference ?? null,
      summary: body.summary ?? null,
      title: body.title,
    },
    ok: true,
  };
}
