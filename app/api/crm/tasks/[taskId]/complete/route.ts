import { NextResponse, type NextRequest } from "next/server";
import { completeCommercialTask } from "@/modules/crm/server/crm-tasks-service";
import type { CompleteCrmTaskInput } from "@/modules/crm";

type RouteContext = {
  params: Promise<{
    taskId: string;
  }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const accessToken = readBearerToken(request);
  const body = (await request.json().catch(() => null)) as Partial<
    CompleteCrmTaskInput
  > | null;
  const { taskId } = await context.params;
  const result = await completeCommercialTask(
    accessToken,
    taskId,
    {
      result: body?.result,
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
