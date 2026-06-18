import { NextResponse, type NextRequest } from "next/server";
import { cancelCommercialTask } from "@/modules/crm/server/crm-tasks-service";
import type { CancelCrmTaskInput } from "@/modules/crm";

type RouteContext = {
  params: Promise<{
    taskId: string;
  }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const accessToken = readBearerToken(request);
  const body = (await request.json().catch(() => null)) as Partial<
    CancelCrmTaskInput
  > | null;
  const { taskId } = await context.params;
  const result = await cancelCommercialTask(
    accessToken,
    taskId,
    {
      reason: body?.reason,
    },
  );

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }

  return NextResponse.json({ task: result.task });
}

function readBearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  return authorization.slice("bearer ".length).trim() || null;
}
