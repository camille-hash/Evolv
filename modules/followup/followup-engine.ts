import type {
  FollowUpEvent,
  FollowUpEventDraft,
  FollowUpSummary,
} from "@/modules/followup/followup-types";

export function buildFollowUpEvent({
  draft,
  existingEvent,
}: {
  draft: FollowUpEventDraft;
  existingEvent?: FollowUpEvent | null;
}): FollowUpEvent {
  return {
    id: existingEvent?.id ?? draft.id ?? createFollowUpEventId(),
    titulo: normalizeTitle(draft.titulo),
    tipo: draft.tipo,
    data: draft.data,
    observacoes: draft.observacoes.trim(),
    concluido: draft.concluido ?? existingEvent?.concluido ?? false,
    notificationSettings: existingEvent?.notificationSettings ?? {
      pushEnabled: false,
      pushPermission: "default",
      pushToken: null,
    },
  };
}

export function splitFollowUpEvents(events: FollowUpEvent[]) {
  return {
    pendingEvents: sortEventsByDate(
      events.filter((event) => !event.concluido),
    ),
    completedEvents: sortEventsByDate(
      events.filter((event) => event.concluido),
    ),
  };
}

export function summarizeFollowUpEvents(
  events: FollowUpEvent[],
  referenceDate = new Date(),
): FollowUpSummary {
  const { pendingEvents } = splitFollowUpEvents(events);
  const nextEvent = pendingEvents[0] ?? null;

  return {
    pendingCount: pendingEvents.length,
    nextEvent,
    daysUntilNextEvent: nextEvent
      ? calculateDaysUntilEvent(nextEvent.data, referenceDate)
      : null,
  };
}

export function calculateDaysUntilEvent(
  eventDate: string,
  referenceDate = new Date(),
) {
  const eventStart = startOfDay(new Date(`${eventDate}T00:00:00`));
  const referenceStart = startOfDay(referenceDate);
  const differenceMs = eventStart.getTime() - referenceStart.getTime();

  return Math.ceil(differenceMs / 86_400_000);
}

export function sortEventsByDate(events: FollowUpEvent[]) {
  return [...events].sort((first, second) => {
    const dateComparison = first.data.localeCompare(second.data);

    return dateComparison || first.titulo.localeCompare(second.titulo);
  });
}

function normalizeTitle(title: string) {
  const trimmedTitle = title.trim();

  return trimmedTitle || "Evento de acompanhamento";
}

function createFollowUpEventId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `followup-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
