import { NextResponse, type NextRequest } from "next/server";
import {
  createCommissionPlan,
  listCommissionPlans,
} from "@/modules/commission-plans/server";
import {
  parseCommissionPlanCreateInput,
  parseCommissionPlanListFilters,
} from "@/modules/commission-plans/validation";

export async function GET(request: NextRequest) {
  const parsedFilters = parseCommissionPlanListFilters(
    request.nextUrl.searchParams,
  );

  if (!parsedFilters.ok) {
    return NextResponse.json(
      { error: parsedFilters.error },
      { status: parsedFilters.status },
    );
  }

  const result = await listCommissionPlans(
    readBearerToken(request),
    parsedFilters.filters,
  );

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }

  return NextResponse.json({ commissionPlans: result.commissionPlans });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsedInput = parseCommissionPlanCreateInput(body);

  if (!parsedInput.ok) {
    return NextResponse.json(
      { error: parsedInput.error },
      { status: parsedInput.status },
    );
  }

  const result = await createCommissionPlan(
    readBearerToken(request),
    parsedInput.input,
  );

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }

  return NextResponse.json(
    { commissionPlan: result.commissionPlan },
    { status: 201 },
  );
}

function readBearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  return authorization.slice("bearer ".length).trim() || null;
}
