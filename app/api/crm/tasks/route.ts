import { NextResponse, type NextRequest } from "next/server";
import {
  createCommercialTask,
  listMyTasksForDateWindow,
  listTasksForLead,
} from "@/modules/crm/server/crm-tasks-service";
import { isCrmTaskType, type CreateCrmTaskInput } from "@/modules/crm";

export async function GET(request: NextRequest) {
  const accessToken = readBearerToken(request);
  const leadId = request.nextUrl.searchParams.get("leadId")?.trim();
  const fromDate = request.nextUrl.searchParams.get("fromDate")?.trim();
  const toDate = request.nextUrl.searchParams.get("toDate")?.trim();

  if (leadId) {
    const result = await listTasksForLead(accessToken, leadId);

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status },
      );
    }

    return NextResponse.json({ tasks: result.tasks });
  }

  if (fromDate && toDate) {
    const result = await listMyTasksForDateWindow(accessToken, {
      fromDate,
      toDate,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status },
      );
    }

    return NextResponse.json({ tasks: result.tasks });
  }

  return NextResponse.json(
    { error: "Informe o lead ou periodo para consultar tarefas." },
    { status: 400 },
  );
}

export async function POST(request: NextRequest) {
  const accessToken = readBearerToken(request);
  const body = (await request.json().catch(() => null)) as Partial<
    CreateCrmTaskInput
  > | null;

  if (
    !body?.leadId ||
    !body.dueDate ||
    !body.title ||
    !isCrmTaskType(body.taskType)
  ) {
    return NextResponse.json(
      { error: "Informe os dados obrigatorios da tarefa." },
      { status: 400 },
    );
  }

  const result = await createCommercialTask(accessToken, {
    assignedUserId: body.assignedUserId,
    dueDate: body.dueDate,
    dueTime: body.dueTime,
    leadId: body.leadId,
    notes: body.notes,
    sourceNoteId: body.sourceNoteId,
    taskType: body.taskType,
    title: body.title,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }

  return NextResponse.json({ task: result.task }, { status: 201 });
}

function readBearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  return authorization.slice("bearer ".length).trim() || null;
}
