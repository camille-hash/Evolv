"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ArrowLeft, Check, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  addCrmActivity,
  addCrmNote,
  buildCrmTimeline,
  completeCrmActivity,
  crmActivityStatusLabels,
  crmActivityTypeLabels,
  crmOpportunityStatusLabels,
  crmPipelineLabels,
  crmStageLabels,
  deleteCrmActivity,
  deleteCrmNote,
  loadCrmActivities,
  loadCrmNotes,
  loadCrmStageChanges,
  type CrmActivity,
  type CrmActivityStatus,
  type CrmActivityType,
  type CrmLead,
  type CrmNote,
  type CrmStageChange,
} from "@/modules/crm";
import { cn } from "@/lib/utils";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  currency: "BRL",
  style: "currency",
});

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

const fieldInputClass =
  "w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/15";

const activityTypes: CrmActivityType[] = [
  "ligacao",
  "whatsapp",
  "reuniao",
  "proposta",
  "retorno",
  "outro",
];

const activityStatuses: CrmActivityStatus[] = ["pending", "completed"];

export function CrmLeadDetail({
  lead,
  onBack,
  pipelineLabel,
  stageLabel,
}: {
  lead: CrmLead;
  onBack: () => void;
  pipelineLabel?: string;
  stageLabel?: string;
}) {
  const [notes, setNotes] = useState<CrmNote[]>([]);
  const [activities, setActivities] = useState<CrmActivity[]>([]);
  const [stageChanges, setStageChanges] = useState<CrmStageChange[]>([]);
  const [noteContent, setNoteContent] = useState("");
  const [activityDraft, setActivityDraft] = useState({
    titulo: "",
    tipo: "ligacao" as CrmActivityType,
    data: "",
    hora: "",
    status: "pending" as CrmActivityStatus,
  });

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setNotes(loadCrmNotes(lead.id));
      setActivities(loadCrmActivities(lead.id));
      setStageChanges(loadCrmStageChanges(lead.id));
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [lead.id]);

  const timeline = useMemo(
    () =>
      buildCrmTimeline({
        activities,
        lead,
        notes,
        stageChanges,
      }),
    [activities, lead, notes, stageChanges],
  );

  function handleAddNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotes(addCrmNote(lead.id, noteContent));
    setNoteContent("");
  }

  function handleAddActivity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setActivities(
      addCrmActivity({
        leadId: lead.id,
        ...activityDraft,
      }),
    );
    setActivityDraft({
      titulo: "",
      tipo: "ligacao",
      data: "",
      hora: "",
      status: "pending",
    });
  }

  return (
    <section className="grid gap-6">
      <section className="executive-surface rounded-md p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Button onClick={onBack} type="button" variant="ghost">
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Voltar ao CRM
            </Button>
            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Oportunidade comercial
            </p>
            <h2 className="mt-2 text-3xl font-semibold text-foreground">
              {lead.nome}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {pipelineLabel ?? crmPipelineLabels[lead.pipeline]} /{" "}
              {stageLabel ?? crmStageLabels[lead.etapa]} /{" "}
              {crmOpportunityStatusLabels[lead.status]}
            </p>
          </div>
          <div className="rounded-md border bg-background/70 p-4 lg:min-w-[260px]">
            <p className="text-xs text-muted-foreground">Valor potencial P&S</p>
            <p className="mt-2 text-2xl font-semibold text-primary">
              {currencyFormatter.format(lead.valorPretendido)}
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <LeadDetailItem label="Telefone" value={lead.telefone || "-"} />
          <LeadDetailItem label="E-mail" value={lead.email || "-"} />
          <LeadDetailItem label="Origem" value={lead.origem || "-"} />
          <LeadDetailItem label="Responsavel" value={lead.consultor || "-"} />
          <LeadDetailItem
            label="Pipeline"
            value={pipelineLabel ?? crmPipelineLabels[lead.pipeline]}
          />
          <LeadDetailItem
            label="Etapa"
            value={stageLabel ?? crmStageLabels[lead.etapa]}
          />
          <LeadDetailItem
            label="Situacao"
            value={crmOpportunityStatusLabels[lead.status]}
          />
          <LeadDetailItem
            label="Criado em"
            value={dateFormatter.format(new Date(lead.createdAt))}
          />
          <LeadDetailItem
            label="Atualizado em"
            value={dateFormatter.format(new Date(lead.updatedAt))}
          />
        </div>

        <div className="mt-5 rounded-md border bg-background/70 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Observacoes gerais
          </p>
          <p className="mt-3 text-sm leading-6 text-foreground">
            {lead.observacoes || "Nenhuma observacao registrada."}
          </p>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <article className="executive-surface rounded-md p-5 sm:p-6">
          <h3 className="text-lg font-semibold text-foreground">Notas</h3>
          <form className="mt-4 grid gap-3" onSubmit={handleAddNote}>
            <textarea
              className={cn(fieldInputClass, "min-h-24 resize-y")}
              onChange={(event) => setNoteContent(event.target.value)}
              placeholder="Registrar nota comercial."
              required
              value={noteContent}
            />
            <Button className="w-fit" type="submit">
              <Plus className="h-4 w-4" aria-hidden />
              Adicionar nota
            </Button>
          </form>

          <div className="mt-5 grid gap-3">
            {notes.length ? (
              notes.map((note) => (
                <article className="rounded-md border bg-background/70 p-4" key={note.id}>
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-xs text-muted-foreground">
                      {dateFormatter.format(new Date(note.createdAt))}
                    </p>
                    <Button
                      onClick={() => setNotes(deleteCrmNote(note.id, lead.id))}
                      size="sm"
                      type="button"
                      variant="ghost"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      Excluir
                    </Button>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-foreground">
                    {note.content}
                  </p>
                </article>
              ))
            ) : (
              <EmptyState text="Nenhuma nota registrada." />
            )}
          </div>
        </article>

        <article className="executive-surface rounded-md p-5 sm:p-6">
          <h3 className="text-lg font-semibold text-foreground">Atividades</h3>
          <form className="mt-4 grid gap-4" onSubmit={handleAddActivity}>
            <Field label="Titulo">
              <input
                className={fieldInputClass}
                onChange={(event) =>
                  setActivityDraft((currentDraft) => ({
                    ...currentDraft,
                    titulo: event.target.value,
                  }))
                }
                placeholder="Enviar proposta, ligar, retorno..."
                required
                value={activityDraft.titulo}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Tipo">
                <select
                  className={fieldInputClass}
                  onChange={(event) =>
                    setActivityDraft((currentDraft) => ({
                      ...currentDraft,
                      tipo: event.target.value as CrmActivityType,
                    }))
                  }
                  value={activityDraft.tipo}
                >
                  {activityTypes.map((type) => (
                    <option key={type} value={type}>
                      {crmActivityTypeLabels[type]}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Status">
                <select
                  className={fieldInputClass}
                  onChange={(event) =>
                    setActivityDraft((currentDraft) => ({
                      ...currentDraft,
                      status: event.target.value as CrmActivityStatus,
                    }))
                  }
                  value={activityDraft.status}
                >
                  {activityStatuses.map((status) => (
                    <option key={status} value={status}>
                      {crmActivityStatusLabels[status]}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Data">
                <input
                  className={fieldInputClass}
                  onChange={(event) =>
                    setActivityDraft((currentDraft) => ({
                      ...currentDraft,
                      data: event.target.value,
                    }))
                  }
                  type="date"
                  value={activityDraft.data}
                />
              </Field>

              <Field label="Hora">
                <input
                  className={fieldInputClass}
                  onChange={(event) =>
                    setActivityDraft((currentDraft) => ({
                      ...currentDraft,
                      hora: event.target.value,
                    }))
                  }
                  type="time"
                  value={activityDraft.hora}
                />
              </Field>
            </div>

            <Button className="w-fit" type="submit">
              <Plus className="h-4 w-4" aria-hidden />
              Criar atividade
            </Button>
          </form>

          <div className="mt-5 grid gap-3">
            {activities.length ? (
              activities.map((activity) => (
                <article
                  className="rounded-md border bg-background/70 p-4"
                  key={activity.id}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-semibold text-foreground">
                          {activity.titulo}
                        </h4>
                        <span className="rounded-full border bg-card px-2 py-0.5 text-xs text-muted-foreground">
                          {crmActivityTypeLabels[activity.tipo]}
                        </span>
                        <span
                          className={cn(
                            "rounded-full border px-2 py-0.5 text-xs font-medium",
                            activity.status === "completed"
                              ? "border-primary/20 text-primary"
                              : "text-muted-foreground",
                          )}
                        >
                          {crmActivityStatusLabels[activity.status]}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {formatActivitySchedule(activity)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {activity.status === "pending" ? (
                        <Button
                          onClick={() =>
                            setActivities(
                              completeCrmActivity(activity.id, lead.id),
                            )
                          }
                          size="sm"
                          type="button"
                          variant="secondary"
                        >
                          <Check className="h-3.5 w-3.5" aria-hidden />
                          Concluir
                        </Button>
                      ) : null}
                      <Button
                        onClick={() =>
                          setActivities(deleteCrmActivity(activity.id, lead.id))
                        }
                        size="sm"
                        type="button"
                        variant="ghost"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden />
                        Excluir
                      </Button>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <EmptyState text="Nenhuma atividade registrada." />
            )}
          </div>
        </article>
      </section>

      <section className="executive-surface rounded-md p-5 sm:p-6">
        <h3 className="text-lg font-semibold text-foreground">Timeline</h3>
        <div className="mt-5 grid gap-3">
          {timeline.map((event) => (
            <article className="rounded-md border bg-background/70 p-4" key={event.id}>
              <p className="text-xs text-muted-foreground">
                {dateFormatter.format(new Date(event.timestamp))}
              </p>
              <p className="mt-2 text-sm font-medium text-foreground">
                {event.description}
              </p>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}

function LeadDetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-background/70 p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-2 font-medium text-foreground">{value}</p>
    </div>
  );
}

function Field({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium text-foreground">
      <span>{label}</span>
      {children}
    </label>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
      {text}
    </div>
  );
}

function formatActivitySchedule(activity: CrmActivity) {
  if (activity.data && activity.hora) {
    return `${activity.data} as ${activity.hora}`;
  }

  if (activity.data) {
    return activity.data;
  }

  if (activity.hora) {
    return activity.hora;
  }

  return "Sem data definida";
}
