import { NextResponse, type NextRequest } from "next/server";
import { createLeadNote, listLeadNotes } from "@/modules/crm/server/crm-lead-notes-service";
import type { CreateCrmLeadNoteInput } from "@/modules/crm";

export async function GET(request: NextRequest) {
  const accessToken = readBearerToken(request);
  const leadId = request.nextUrl.searchParams.get("leadId")?.trim();

  if (!leadId) {
    return NextResponse.json(
      { error: "Informe o lead para consultar notas." },
      { status: 400 },
    );
  }

  const result = await listLeadNotes(accessToken, leadId);

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }

  return NextResponse.json({ notes: result.notes });
}

export async function POST(request: NextRequest) {
  const accessToken = readBearerToken(request);
  const body = (await request.json().catch(() => null)) as Partial<
    CreateCrmLeadNoteInput
  > | null;

  if (!body?.leadId || typeof body.content !== "string") {
    return NextResponse.json(
      { error: "Informe o lead e o conteudo da nota." },
      { status: 400 },
    );
  }

  const result = await createLeadNote(accessToken, {
    content: body.content,
    leadId: body.leadId,
    metadata: isPlainObject(body.metadata) ? body.metadata : undefined,
    noteType: body.noteType,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }

  return NextResponse.json({ note: result.note }, { status: 201 });
}

function readBearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  return authorization.slice("bearer ".length).trim() || null;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value),
  );
}
