import { NextRequest, NextResponse } from "next/server";
import {
  archiveKnowledgeItem,
  createKnowledgeItem,
  listKnowledgeItemsByLead,
} from "@/modules/crm/server/crm-lead-knowledge-service";
import {
  isCrmLeadKnowledgeCategory,
  isCrmLeadKnowledgeConfidence,
  isCrmLeadKnowledgeType,
  type CreateCrmLeadKnowledgeItemInput,
} from "@/modules/crm";

export async function GET(request: NextRequest) {
  const accessToken = readBearerToken(request);
  const leadId = request.nextUrl.searchParams.get("leadId")?.trim();

  if (!leadId) {
    return NextResponse.json(
      { error: "Informe o lead da memoria organizacional." },
      { status: 400 },
    );
  }

  const result = await listKnowledgeItemsByLead(accessToken, leadId);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ items: result.items });
}

export async function POST(request: NextRequest) {
  const accessToken = readBearerToken(request);
  const body = (await request.json().catch(() => null)) as Partial<
    CreateCrmLeadKnowledgeItemInput
  > | null;

  const parsed = parseCreateKnowledgePayload(body);

  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const result = await createKnowledgeItem(accessToken, parsed.input);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ item: result.item }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const accessToken = readBearerToken(request);
  const body = (await request.json().catch(() => null)) as {
    itemId?: unknown;
  } | null;

  if (typeof body?.itemId !== "string" || !body.itemId.trim()) {
    return NextResponse.json(
      { error: "Informe o conhecimento." },
      { status: 400 },
    );
  }

  const result = await archiveKnowledgeItem(accessToken, body.itemId);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ item: result.item });
}

function readBearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  return authorization.slice("bearer ".length).trim() || null;
}

function parseCreateKnowledgePayload(
  body: Partial<CreateCrmLeadKnowledgeItemInput> | null,
):
  | { input: CreateCrmLeadKnowledgeItemInput; ok: true }
  | { error: string; ok: false } {
  if (!body?.leadId || typeof body.leadId !== "string") {
    return {
      error: "Informe o lead da memoria organizacional.",
      ok: false,
    };
  }

  if (!body.title || typeof body.title !== "string" || !body.title.trim()) {
    return {
      error: "Titulo e obrigatorio.",
      ok: false,
    };
  }

  if (!isCrmLeadKnowledgeType(body.knowledgeType)) {
    return {
      error: "Tipo de conhecimento invalido.",
      ok: false,
    };
  }

  if (
    body.knowledgeCategory !== undefined &&
    !isCrmLeadKnowledgeCategory(body.knowledgeCategory)
  ) {
    return {
      error: "Categoria de conhecimento invalida.",
      ok: false,
    };
  }

  if (
    body.confidence !== undefined &&
    !isCrmLeadKnowledgeConfidence(body.confidence)
  ) {
    return {
      error: "Confianca invalida.",
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

  return {
    input: {
      confidence: body.confidence ?? "MEDIUM",
      knowledgeCategory: body.knowledgeCategory ?? "DECLARED",
      knowledgeType: body.knowledgeType,
      leadId: body.leadId,
      summary: body.summary ?? null,
      title: body.title,
    },
    ok: true,
  };
}
