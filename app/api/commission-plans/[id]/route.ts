import { NextResponse, type NextRequest } from "next/server";
import {
  getCommissionPlanById,
  updateCommissionPlan,
} from "@/modules/commission-plans/server";
import { parseCommissionPlanUpdateInput } from "@/modules/commission-plans/validation";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const result = await getCommissionPlanById(readBearerToken(request), id);

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }

  return NextResponse.json({ commissionPlan: result.commissionPlan });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const parsedInput = parseCommissionPlanUpdateInput(body);

  if (!parsedInput.ok) {
    return NextResponse.json(
      { error: parsedInput.error },
      { status: parsedInput.status },
    );
  }

  const result = await updateCommissionPlan(
    readBearerToken(request),
    id,
    parsedInput.input,
  );

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }

  return NextResponse.json({ commissionPlan: result.commissionPlan });
}

function readBearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  return authorization.slice("bearer ".length).trim() || null;
}
