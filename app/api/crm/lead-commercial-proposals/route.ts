import { NextResponse, type NextRequest } from "next/server";
import {
  approveCommercialProposal,
  createLeadCommercialProposal,
  expireCommercialProposal,
  getLeadCommercialProposalById,
  listLeadCommercialProposalsByLeadId,
  markCommercialProposalAsPresented,
  rejectCommercialProposal,
  supersedeCommercialProposal,
} from "@/modules/crm/server/crm-lead-commercial-proposals-service";
import {
  isCrmLeadCommercialProposalSource,
  type CreateCrmLeadCommercialProposalInput,
} from "@/modules/crm";

export async function GET(request: NextRequest) {
  const accessToken = readBearerToken(request);
  const leadId = request.nextUrl.searchParams.get("leadId")?.trim();
  const proposalId = request.nextUrl.searchParams
    .get("proposalId")
    ?.trim();

  if (proposalId) {
    const result = await getLeadCommercialProposalById(accessToken, proposalId);

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status },
      );
    }

    return NextResponse.json({ proposal: result.proposal });
  }

  if (!leadId) {
    return NextResponse.json(
      { error: "Informe o lead para consultar propostas." },
      { status: 400 },
    );
  }

  const result = await listLeadCommercialProposalsByLeadId(accessToken, leadId);

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }

  return NextResponse.json({ proposals: result.proposals });
}

export async function POST(request: NextRequest) {
  const accessToken = readBearerToken(request);
  const body = (await request.json().catch(() => null)) as Partial<
    CreateCrmLeadCommercialProposalInput
  > | null;

  if (
    !body?.leadId ||
    !body.title ||
    !isCrmLeadCommercialProposalSource(body.sourceSuggestion) ||
    !isPlainObject(body.originalSnapshot) ||
    !isPlainObject(body.savedSnapshot)
  ) {
    return NextResponse.json(
      { error: "Informe os dados obrigatorios da proposta." },
      { status: 400 },
    );
  }

  const result = await createLeadCommercialProposal(accessToken, {
    leadId: body.leadId,
    assembly: isPlainObject(body.assembly) ? body.assembly : undefined,
    metadata: isPlainObject(body.metadata) ? body.metadata : undefined,
    originalSnapshot: body.originalSnapshot,
    savedSnapshot: body.savedSnapshot,
    simulationId:
      typeof body.simulationId === "string" ? body.simulationId : undefined,
    sourceSuggestion: body.sourceSuggestion,
    status: body.status,
    summary: isPlainObject(body.summary) ? body.summary : undefined,
    title: body.title,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }

  return NextResponse.json({ proposal: result.proposal }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const accessToken = readBearerToken(request);
  const body = (await request.json().catch(() => null)) as {
    action?: unknown;
    proposalId?: unknown;
  } | null;

  if (typeof body?.proposalId !== "string" || !body.proposalId.trim()) {
    return NextResponse.json(
      { error: "Informe a proposta." },
      { status: 400 },
    );
  }

  const action = typeof body.action === "string" ? body.action : "";
  const result =
    action === "present"
      ? await markCommercialProposalAsPresented(accessToken, body.proposalId)
      : action === "approve"
        ? await approveCommercialProposal(accessToken, body.proposalId)
        : action === "reject"
          ? await rejectCommercialProposal(accessToken, body.proposalId)
          : action === "expire"
            ? await expireCommercialProposal(accessToken, body.proposalId)
            : action === "supersede"
              ? await supersedeCommercialProposal(accessToken, body.proposalId)
              : null;

  if (!result) {
    return NextResponse.json(
      { error: "Acao de proposta invalida." },
      { status: 400 },
    );
  }

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }

  return NextResponse.json({ proposal: result.proposal });
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
