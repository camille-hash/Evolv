import { NextResponse, type NextRequest } from "next/server";
import {
  createLeadSimulation,
  getLeadSimulationById,
  listLeadSimulationsByLeadId,
} from "@/modules/crm/server/crm-lead-simulations-service";
import {
  isCrmLeadSimulationSource,
  isCrmLeadSimulationType,
  type CreateCrmLeadSimulationInput,
} from "@/modules/crm";

export async function GET(request: NextRequest) {
  const accessToken = readBearerToken(request);
  const leadId = request.nextUrl.searchParams.get("leadId")?.trim();
  const simulationId = request.nextUrl.searchParams
    .get("simulationId")
    ?.trim();

  if (simulationId) {
    const result = await getLeadSimulationById(accessToken, simulationId);

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status },
      );
    }

    return NextResponse.json({ simulation: result.simulation });
  }

  if (!leadId) {
    return NextResponse.json(
      { error: "Informe o lead para consultar simulacoes." },
      { status: 400 },
    );
  }

  const result = await listLeadSimulationsByLeadId(accessToken, leadId);

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }

  return NextResponse.json({ simulations: result.simulations });
}

export async function POST(request: NextRequest) {
  const accessToken = readBearerToken(request);
  const body = (await request.json().catch(() => null)) as Partial<
    CreateCrmLeadSimulationInput
  > | null;

  if (
    !body?.leadId ||
    !body.title ||
    !isCrmLeadSimulationType(body.simulationType) ||
    !isPlainObject(body.technicalInput) ||
    !isPlainObject(body.calculationSnapshot) ||
    !isPlainObject(body.presentationSnapshot)
  ) {
    return NextResponse.json(
      { error: "Informe os dados obrigatorios da simulacao." },
      { status: 400 },
    );
  }

  if (body.source && !isCrmLeadSimulationSource(body.source)) {
    return NextResponse.json(
      { error: "Origem da simulacao invalida." },
      { status: 400 },
    );
  }

  const result = await createLeadSimulation(accessToken, {
    calculationSnapshot: body.calculationSnapshot,
    leadId: body.leadId,
    presentationSnapshot: body.presentationSnapshot,
    simulationType: body.simulationType,
    source: body.source,
    summary: isPlainObject(body.summary) ? body.summary : undefined,
    technicalInput: body.technicalInput,
    title: body.title,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }

  return NextResponse.json({ simulation: result.simulation }, { status: 201 });
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
