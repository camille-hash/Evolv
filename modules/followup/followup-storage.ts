import {
  buildFollowUpEvent,
  sortEventsByDate,
} from "@/modules/followup/followup-engine";
import type {
  FollowUpEvent,
  FollowUpEventDraft,
  FollowUpEventType,
  FollowUpNotificationSettings,
} from "@/modules/followup/followup-types";

export const FOLLOWUP_STORAGE_KEY = "evolv.followup.v1";

const defaultNotificationSettings: FollowUpNotificationSettings = {
  pushEnabled: false,
  pushPermission: "default",
  pushToken: null,
};

export function loadFollowUpEvents(): FollowUpEvent[] {
  if (!canUseLocalStorage()) {
    return [];
  }

  const rawValue = window.localStorage.getItem(FOLLOWUP_STORAGE_KEY);

  if (!rawValue) {
    return [];
  }

  try {
    const parsedValue = JSON.parse(rawValue);

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return sortEventsByDate(
      parsedValue
        .map(normalizeFollowUpEvent)
        .filter((event): event is FollowUpEvent => Boolean(event)),
    );
  } catch {
    return [];
  }
}

export function saveFollowUpEvent(draft: FollowUpEventDraft) {
  const events = loadFollowUpEvents();
  const existingEvent = draft.id
    ? events.find((event) => event.id === draft.id)
    : null;
  const nextEvent = buildFollowUpEvent({ draft, existingEvent });
  const nextEvents = existingEvent
    ? events.map((event) => event.id === nextEvent.id ? nextEvent : event)
    : [...events, nextEvent];

  persistFollowUpEvents(nextEvents);

  return sortEventsByDate(nextEvents);
}

export function deleteFollowUpEvent(eventId: string) {
  const nextEvents = loadFollowUpEvents().filter(
    (event) => event.id !== eventId,
  );

  persistFollowUpEvents(nextEvents);

  return nextEvents;
}

export function toggleFollowUpEventConclusion(eventId: string) {
  const events = loadFollowUpEvents();
  const nextEvents = events.map((event) =>
    event.id === eventId
      ? {
          ...event,
          concluido: !event.concluido,
        }
      : event,
  );

  persistFollowUpEvents(nextEvents);

  return sortEventsByDate(nextEvents);
}

function persistFollowUpEvents(events: FollowUpEvent[]) {
  if (!canUseLocalStorage()) {
    return;
  }

  window.localStorage.setItem(
    FOLLOWUP_STORAGE_KEY,
    JSON.stringify(sortEventsByDate(events)),
  );
}

function normalizeFollowUpEvent(value: unknown): FollowUpEvent | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const event = value as Partial<FollowUpEvent>;

  if (!event.id || !event.titulo || !event.tipo || !event.data) {
    return null;
  }

  return {
    id: event.id,
    titulo: event.titulo,
    tipo: normalizeEventType(event.tipo),
    data: event.data,
    observacoes: event.observacoes ?? "",
    concluido: Boolean(event.concluido),
    notificationSettings: {
      ...defaultNotificationSettings,
      ...(event.notificationSettings ?? {}),
    },
  };
}

function normalizeEventType(type: unknown): FollowUpEventType {
  const validTypes: FollowUpEventType[] = [
    "boleto",
    "assembleia",
    "lance",
    "contemplacao",
    "personalizado",
  ];

  return validTypes.includes(type as FollowUpEventType)
    ? (type as FollowUpEventType)
    : "personalizado";
}

function canUseLocalStorage() {
  return typeof window !== "undefined" && "localStorage" in window;
}
