import {
  crmPipelineLabels,
  crmStageLabels,
} from "./crm-engine";
import type {
  CrmActivity,
  CrmLead,
  CrmNote,
  CrmStageChange,
  CrmTimelineEvent,
} from "./crm-types";

export const crmActivityTypeLabels: Record<CrmActivity["tipo"], string> = {
  ligacao: "Ligacao",
  whatsapp: "WhatsApp",
  reuniao: "Reuniao",
  proposta: "Proposta",
  retorno: "Retorno",
  outro: "Outro",
};

export const crmActivityStatusLabels: Record<CrmActivity["status"], string> = {
  pending: "Pendente",
  completed: "Concluida",
};

export function buildCrmTimeline({
  activities,
  lead,
  notes,
  stageChanges,
}: {
  activities: CrmActivity[];
  lead: CrmLead;
  notes: CrmNote[];
  stageChanges: CrmStageChange[];
}): CrmTimelineEvent[] {
  const leadCreatedEvent: CrmTimelineEvent = {
    id: `lead-created-${lead.id}`,
    type: "lead-created",
    timestamp: lead.createdAt,
    description: "Lead criado.",
  };

  const noteEvents = notes.map<CrmTimelineEvent>((note) => ({
    id: `note-created-${note.id}`,
    type: "note-created",
    timestamp: note.createdAt,
    description: "Nota adicionada.",
  }));

  const activityCreatedEvents = activities.map<CrmTimelineEvent>((activity) => ({
    id: `activity-created-${activity.id}`,
    type: "activity-created",
    timestamp: activity.createdAt,
    description: `Atividade criada: ${activity.titulo}.`,
  }));

  const activityCompletedEvents = activities
    .filter((activity) => activity.completedAt)
    .map<CrmTimelineEvent>((activity) => ({
      id: `activity-completed-${activity.id}`,
      type: "activity-completed",
      timestamp: activity.completedAt ?? activity.createdAt,
      description: `Atividade concluida: ${activity.titulo}.`,
    }));

  const stageChangeEvents = stageChanges.map<CrmTimelineEvent>((change) => ({
    id: `stage-changed-${change.id}`,
    type: "stage-changed",
    timestamp: change.createdAt,
    description: `Lead movido de ${crmPipelineLabels[change.fromPipeline]} / ${
      crmStageLabels[change.fromStage]
    } para ${crmPipelineLabels[change.toPipeline]} / ${
      crmStageLabels[change.toStage]
    }.`,
  }));

  return sortCrmTimelineEvents([
    leadCreatedEvent,
    ...noteEvents,
    ...activityCreatedEvents,
    ...activityCompletedEvents,
    ...stageChangeEvents,
  ]);
}

export function sortCrmTimelineEvents(events: CrmTimelineEvent[]) {
  return [...events].sort(
    (left, right) =>
      new Date(right.timestamp).getTime() -
      new Date(left.timestamp).getTime(),
  );
}
