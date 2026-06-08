"use client";

import { useEffect, useMemo, useState } from "react";
import {
  calculateDaysUntilEvent,
  deleteFollowUpEvent,
  loadFollowUpEvents,
  saveFollowUpEvent,
  splitFollowUpEvents,
  toggleFollowUpEventConclusion,
  type FollowUpEvent,
  type FollowUpEventDraft,
  type FollowUpEventType,
} from "@/modules/followup";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const eventTypeLabels: Record<FollowUpEventType, string> = {
  boleto: "Boleto",
  assembleia: "Assembleia",
  lance: "Lance",
  contemplacao: "Contemplacao",
  personalizado: "Personalizado",
};

const eventTypeOptions = Object.entries(eventTypeLabels) as Array<
  [FollowUpEventType, string]
>;

const emptyDraft: FollowUpEventDraft = {
  titulo: "",
  tipo: "boleto",
  data: new Date().toISOString().slice(0, 10),
  observacoes: "",
  concluido: false,
};

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export function FollowUpPage() {
  const [events, setEvents] = useState<FollowUpEvent[]>([]);
  const [draft, setDraft] = useState<FollowUpEventDraft>(emptyDraft);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setEvents(loadFollowUpEvents());
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const { completedEvents, pendingEvents } = useMemo(
    () => splitFollowUpEvents(events),
    [events],
  );

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextEvents = saveFollowUpEvent({
      ...draft,
      id: editingEventId,
    });

    setEvents(nextEvents);
    setDraft(emptyDraft);
    setEditingEventId(null);
  }

  function handleEdit(event: FollowUpEvent) {
    setEditingEventId(event.id);
    setDraft({
      id: event.id,
      titulo: event.titulo,
      tipo: event.tipo,
      data: event.data,
      observacoes: event.observacoes,
      concluido: event.concluido,
    });
  }

  function handleDelete(eventId: string) {
    setEvents(deleteFollowUpEvent(eventId));

    if (editingEventId === eventId) {
      setEditingEventId(null);
      setDraft(emptyDraft);
    }
  }

  function handleToggleConclusion(eventId: string) {
    setEvents(toggleFollowUpEventConclusion(eventId));
  }

  return (
    <section className="grid gap-6">
      <section className="executive-surface rounded-md p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Central de acompanhamento
        </p>
        <h2 className="mt-3 text-2xl font-semibold text-foreground">
          Eventos do cliente
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          Registre boletos, assembleias, prazos de lance, contemplacoes e
          lembretes personalizados. A estrutura ja guarda configuracoes futuras
          para notificacoes, sem disparar push, WhatsApp ou e-mail nesta fase.
        </p>

        <form className="mt-6 grid gap-4 lg:grid-cols-5" onSubmit={handleSubmit}>
          <label className="grid gap-2 lg:col-span-2">
            <span className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
              Titulo
            </span>
            <input
              className="h-10 rounded-md border bg-background px-3 text-sm text-foreground outline-none transition focus:border-primary"
              onChange={(event) =>
                setDraft((currentDraft) => ({
                  ...currentDraft,
                  titulo: event.target.value,
                }))
              }
              placeholder="Boleto vence em 3 dias"
              value={draft.titulo}
            />
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
              Tipo
            </span>
            <select
              className="h-10 rounded-md border bg-background px-3 text-sm text-foreground outline-none transition focus:border-primary"
              onChange={(event) =>
                setDraft((currentDraft) => ({
                  ...currentDraft,
                  tipo: event.target.value as FollowUpEventType,
                }))
              }
              value={draft.tipo}
            >
              {eventTypeOptions.map(([type, label]) => (
                <option key={type} value={type}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
              Data
            </span>
            <input
              className="h-10 rounded-md border bg-background px-3 text-sm text-foreground outline-none transition focus:border-primary"
              onChange={(event) =>
                setDraft((currentDraft) => ({
                  ...currentDraft,
                  data: event.target.value,
                }))
              }
              type="date"
              value={draft.data}
            />
          </label>

          <div className="flex items-end">
            <Button className="w-full" type="submit">
              {editingEventId ? "Salvar edicao" : "Criar evento"}
            </Button>
          </div>

          <label className="grid gap-2 lg:col-span-5">
            <span className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
              Observacoes
            </span>
            <textarea
              className="min-h-24 rounded-md border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary"
              onChange={(event) =>
                setDraft((currentDraft) => ({
                  ...currentDraft,
                  observacoes: event.target.value,
                }))
              }
              placeholder="Contexto comercial, documentos, combinados ou proximos passos."
              value={draft.observacoes}
            />
          </label>
        </form>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <EventColumn
          emptyText="Nenhum evento pendente."
          events={pendingEvents}
          onDelete={handleDelete}
          onEdit={handleEdit}
          onToggleConclusion={handleToggleConclusion}
          title="Proximos Eventos"
        />
        <EventColumn
          emptyText="Nenhum evento concluido."
          events={completedEvents}
          onDelete={handleDelete}
          onEdit={handleEdit}
          onToggleConclusion={handleToggleConclusion}
          title="Eventos Concluidos"
        />
      </section>
    </section>
  );
}

function EventColumn({
  emptyText,
  events,
  onDelete,
  onEdit,
  onToggleConclusion,
  title,
}: {
  emptyText: string;
  events: FollowUpEvent[];
  onDelete: (eventId: string) => void;
  onEdit: (event: FollowUpEvent) => void;
  onToggleConclusion: (eventId: string) => void;
  title: string;
}) {
  return (
    <section className="executive-surface rounded-md p-6">
      <h2 className="text-xl font-semibold text-foreground">{title}</h2>
      <div className="mt-5 grid gap-3">
        {events.length > 0 ? (
          events.map((event) => (
            <EventCard
              event={event}
              key={event.id}
              onDelete={onDelete}
              onEdit={onEdit}
              onToggleConclusion={onToggleConclusion}
            />
          ))
        ) : (
          <div className="rounded-md border border-dashed bg-background/70 p-5 text-sm text-muted-foreground">
            {emptyText}
          </div>
        )}
      </div>
    </section>
  );
}

function EventCard({
  event,
  onDelete,
  onEdit,
  onToggleConclusion,
}: {
  event: FollowUpEvent;
  onDelete: (eventId: string) => void;
  onEdit: (event: FollowUpEvent) => void;
  onToggleConclusion: (eventId: string) => void;
}) {
  const daysUntilEvent = calculateDaysUntilEvent(event.data);

  return (
    <article className="rounded-md border bg-background/70 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
            {eventTypeLabels[event.tipo]}
          </p>
          <h3 className="mt-2 text-lg font-semibold text-foreground">
            {event.titulo}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {dateFormatter.format(new Date(`${event.data}T00:00:00`))} ·{" "}
            {formatDaysUntilEvent(daysUntilEvent)}
          </p>
        </div>
        <span
          className={cn(
            "w-fit rounded-md border px-3 py-1 text-xs font-medium",
            event.concluido
              ? "bg-muted text-muted-foreground"
              : "bg-primary text-primary-foreground",
          )}
        >
          {event.concluido ? "Concluido" : "Pendente"}
        </span>
      </div>

      {event.observacoes ? (
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          {event.observacoes}
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-2">
        <Button
          onClick={() => onToggleConclusion(event.id)}
          size="sm"
          type="button"
          variant="secondary"
        >
          {event.concluido ? "Reabrir" : "Concluir"}
        </Button>
        <Button
          onClick={() => onEdit(event)}
          size="sm"
          type="button"
          variant="ghost"
        >
          Editar
        </Button>
        <Button
          onClick={() => onDelete(event.id)}
          size="sm"
          type="button"
          variant="ghost"
        >
          Excluir
        </Button>
      </div>
    </article>
  );
}

function formatDaysUntilEvent(daysUntilEvent: number) {
  if (daysUntilEvent === 0) {
    return "hoje";
  }

  if (daysUntilEvent > 0) {
    return `${daysUntilEvent} dias restantes`;
  }

  return `${Math.abs(daysUntilEvent)} dias em atraso`;
}
