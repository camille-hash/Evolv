"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  Check,
  MessageCircle,
  Pencil,
  Phone,
  Plus,
  Trash2,
} from "lucide-react";
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
  crmTemperatureLabels,
  deleteCrmActivity,
  deleteCrmNote,
  addCrmLeadSimulation,
  loadCrmLeadSimulations,
  loadCrmActivities,
  loadCrmNotes,
  loadCrmStageChanges,
  updateCrmLeadSimulationStatus,
  type CrmActivity,
  type CrmActivityStatus,
  type CrmActivityType,
  type CrmLead,
  type CrmLeadSimulationRecord,
  type CrmLeadSimulationStatus,
  type CrmNote,
  type CrmStageChange,
  type CrmTemperature,
} from "@/modules/crm";
import {
  loadSavedSimulations,
  type SimulatorSavedSimulation,
} from "@/modules/simulator";
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
const simulationStatuses: CrmLeadSimulationStatus[] = [
  "apresentada",
  "descartada",
  "escolhida",
];
const simulationStatusLabels: Record<CrmLeadSimulationStatus, string> = {
  apresentada: "Apresentada ao cliente",
  descartada: "Descartada",
  escolhida: "Proposta escolhida",
};

export function CrmLeadDetail({
  lead,
  onBack,
  onEdit,
  onGenerateSimulation,
  onGenerateProposal,
  pipelineLabel,
  stageLabel,
}: {
  lead: CrmLead;
  onBack: () => void;
  onEdit: () => void;
  onGenerateSimulation?: (lead: CrmLead) => void;
  onGenerateProposal?: (lead: CrmLead) => void;
  pipelineLabel?: string;
  stageLabel?: string;
}) {
  const [notes, setNotes] = useState<CrmNote[]>([]);
  const [activities, setActivities] = useState<CrmActivity[]>([]);
  const [stageChanges, setStageChanges] = useState<CrmStageChange[]>([]);
  const [savedSimulations, setSavedSimulations] = useState<
    SimulatorSavedSimulation[]
  >([]);
  const [leadSimulations, setLeadSimulations] = useState<
    CrmLeadSimulationRecord[]
  >([]);
  const [noteContent, setNoteContent] = useState("");
  const [simulationDraft, setSimulationDraft] = useState({
    notes: "",
    simulationId: "",
    status: "apresentada" as CrmLeadSimulationStatus,
  });
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
      setSavedSimulations(loadSavedSimulations());
      setLeadSimulations(loadCrmLeadSimulations(lead.id));
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
  const pipelineName = pipelineLabel ?? crmPipelineLabels[lead.pipeline];
  const stageName = stageLabel ?? crmStageLabels[lead.etapa];
  const phoneDigits = lead.telefone.replace(/\D/g, "");
  const canUsePhone = phoneDigits.length > 0;
  const nextActionText = lead.proximaAcao
    ? `${lead.proximaAcao}${lead.dataProximaAcao ? ` - ${lead.dataProximaAcao}` : ""}`
    : "";

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

  function handleAddSimulation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const selectedSimulation = savedSimulations.find(
      (simulation) => simulation.id === simulationDraft.simulationId,
    );

    if (!selectedSimulation) {
      return;
    }

    setLeadSimulations(
      addCrmLeadSimulation({
        leadId: lead.id,
        notes: simulationDraft.notes,
        simulation: selectedSimulation,
        status: simulationDraft.status,
      }),
    );
    setSimulationDraft({
      notes: "",
      simulationId: "",
      status: "apresentada",
    });
  }

  function handleSimulationStatusChange(
    recordId: string,
    status: CrmLeadSimulationStatus,
  ) {
    setLeadSimulations(
      updateCrmLeadSimulationStatus({
        leadId: lead.id,
        recordId,
        status,
      }),
    );
  }

  return (
    <section className="grid gap-6">
      <section className="executive-surface rounded-md p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <Button onClick={onBack} type="button" variant="ghost">
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Voltar ao CRM
            </Button>
            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Oportunidade comercial
            </p>
            <div className="mt-2 flex min-w-0 flex-wrap items-center gap-3">
              <h2 className="min-w-0 truncate text-3xl font-semibold text-foreground">
                {lead.nome}
              </h2>
              <TemperatureBadge temperature={lead.temperatura} />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
              <OperationalPill label={pipelineName} />
              <OperationalPill label={stageName} />
              <OperationalPill label={crmOpportunityStatusLabels[lead.status]} />
            </div>
          </div>
          <div className="rounded-md border bg-background/70 p-4 lg:min-w-[260px]">
            <p className="text-xs text-muted-foreground">Valor potencial P&S</p>
            <p className="mt-2 text-2xl font-semibold text-primary">
              {currencyFormatter.format(lead.valorPretendido)}
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-[1fr_0.9fr]">
          <article
            className={cn(
              "rounded-md border p-4",
              lead.proximaAcao
                ? "border-primary/20 bg-primary/5"
                : "border-[#d9a184] bg-[#f5e8df]",
            )}
          >
            <div className="flex items-start gap-3">
              {lead.proximaAcao ? (
                <CalendarClock
                  className="mt-0.5 h-4 w-4 text-primary"
                  aria-hidden
                />
              ) : (
                <AlertTriangle
                  className="mt-0.5 h-4 w-4 text-[#9a4f32]"
                  aria-hidden
                />
              )}
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Proxima acao
                </p>
                <p className="mt-2 text-sm font-semibold text-foreground">
                  {nextActionText || "Sem proxima acao definida"}
                </p>
              </div>
            </div>
          </article>

          <article className="rounded-md border bg-background/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Acoes rapidas
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {canUsePhone ? (
                <Button asChild size="sm" type="button" variant="secondary">
                  <a href={`tel:${phoneDigits}`}>
                    <Phone className="h-3.5 w-3.5" aria-hidden />
                    Ligar
                  </a>
                </Button>
              ) : (
                <Button disabled size="sm" type="button" variant="secondary">
                  <Phone className="h-3.5 w-3.5" aria-hidden />
                  Ligar
                </Button>
              )}
              {canUsePhone ? (
                <Button asChild size="sm" type="button" variant="secondary">
                  <a
                    href={`https://wa.me/${phoneDigits}`}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <MessageCircle className="h-3.5 w-3.5" aria-hidden />
                    WhatsApp
                  </a>
                </Button>
              ) : (
                <Button disabled size="sm" type="button" variant="secondary">
                  <MessageCircle className="h-3.5 w-3.5" aria-hidden />
                  WhatsApp
                </Button>
              )}
              <Button onClick={onEdit} size="sm" type="button">
                <Pencil className="h-3.5 w-3.5" aria-hidden />
                Editar
              </Button>
              {onGenerateSimulation ? (
                <Button
                  onClick={() => onGenerateSimulation(lead)}
                  size="sm"
                  type="button"
                  variant="secondary"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden />
                  Gerar simulacao
                </Button>
              ) : null}
              {onGenerateProposal ? (
                <Button
                  onClick={() => onGenerateProposal(lead)}
                  size="sm"
                  type="button"
                  variant="secondary"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden />
                  Gerar proposta
                </Button>
              ) : null}
            </div>
          </article>
        </div>

        <div className="mt-4 rounded-md border bg-background/70 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Historico operacional
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <OperationalHistoryItem
              label="Lead criado"
              value={formatDateTime(lead.createdAt)}
            />
            <OperationalHistoryItem
              label="Etapa atual"
              value={`${pipelineName} / ${stageName}`}
            />
            <OperationalHistoryItem
              label="Ultima atualizacao"
              value={formatDateTime(lead.updatedAt)}
            />
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <LeadDetailItem label="Telefone" value={lead.telefone || "-"} />
          <LeadDetailItem label="E-mail" value={lead.email || "-"} />
          <LeadDetailItem label="Origem" value={lead.origem || "-"} />
          <LeadDetailItem label="Responsavel" value={lead.consultor || "-"} />
          <LeadDetailItem label="Pipeline" value={pipelineName} />
          <LeadDetailItem label="Etapa" value={stageName} />
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

      <section className="executive-surface rounded-md p-5 sm:p-6">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Simulacoes
            </p>
            <h3 className="mt-2 text-lg font-semibold text-foreground">
              Historico comercial do lead
            </h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Registre propostas apresentadas, descartadas ou escolhidas.
          </p>
        </div>

        <form
          className="mt-5 grid gap-4 rounded-md border bg-background/70 p-4 lg:grid-cols-[1fr_0.7fr_1fr_auto]"
          onSubmit={handleAddSimulation}
        >
          <Field label="Simulacao existente">
            <select
              className={fieldInputClass}
              onChange={(event) =>
                setSimulationDraft((currentDraft) => ({
                  ...currentDraft,
                  simulationId: event.target.value,
                }))
              }
              required
              value={simulationDraft.simulationId}
            >
              <option value="">Selecionar simulacao</option>
              {savedSimulations.map((simulation) => (
                <option key={simulation.id} value={simulation.id}>
                  {simulation.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Status">
            <select
              className={fieldInputClass}
              onChange={(event) =>
                setSimulationDraft((currentDraft) => ({
                  ...currentDraft,
                  status: event.target.value as CrmLeadSimulationStatus,
                }))
              }
              value={simulationDraft.status}
            >
              {simulationStatuses.map((status) => (
                <option key={status} value={status}>
                  {simulationStatusLabels[status]}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Observacoes">
            <input
              className={fieldInputClass}
              onChange={(event) =>
                setSimulationDraft((currentDraft) => ({
                  ...currentDraft,
                  notes: event.target.value,
                }))
              }
              placeholder="Contexto da proposta"
              value={simulationDraft.notes}
            />
          </Field>

          <div className="flex items-end">
            <Button
              className="w-full lg:w-fit"
              disabled={!savedSimulations.length}
              type="submit"
            >
              <Plus className="h-4 w-4" aria-hidden />
              Registrar
            </Button>
          </div>
        </form>

        {!savedSimulations.length ? (
          <p className="mt-3 rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            Nenhuma simulacao salva encontrada. Salve uma simulacao antes de
            vincular ao lead.
          </p>
        ) : null}

        <div className="mt-5 grid gap-3">
          {leadSimulations.length ? (
            leadSimulations.map((simulation, index) => (
              <article
                className="rounded-md border bg-background/70 p-4"
                key={simulation.id}
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      Simulacao {String(index + 1).padStart(2, "0")}
                    </p>
                    <h4 className="mt-2 text-base font-semibold text-foreground">
                      {simulation.simulationName}
                    </h4>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Data: {formatDateTime(simulation.simulationDate)}
                    </p>
                  </div>
                  <SimulationStatusBadge status={simulation.status} />
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <LeadDetailItem
                    label="Credito"
                    value={currencyFormatter.format(simulation.credit)}
                  />
                  <LeadDetailItem
                    label="Parcela"
                    value={currencyFormatter.format(simulation.installment)}
                  />
                  <LeadDetailItem label="Cenario" value={simulation.scenario} />
                  <LeadDetailItem
                    label="Administradora"
                    value={simulation.administrator}
                  />
                </div>

                {simulation.notes ? (
                  <p className="mt-4 rounded-md border bg-card p-3 text-sm leading-6 text-foreground">
                    {simulation.notes}
                  </p>
                ) : null}

                <div className="mt-4 flex flex-wrap gap-2">
                  {simulationStatuses.map((status) => (
                    <Button
                      key={status}
                      onClick={() =>
                        handleSimulationStatusChange(simulation.id, status)
                      }
                      size="sm"
                      type="button"
                      variant={
                        simulation.status === status ? "default" : "secondary"
                      }
                    >
                      {simulationStatusLabels[status]}
                    </Button>
                  ))}
                </div>
              </article>
            ))
          ) : (
            <EmptyState text="Nenhuma simulacao vinculada a este lead." />
          )}
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

function OperationalPill({ label }: { label: string }) {
  return (
    <span className="rounded-full border bg-background/70 px-2.5 py-1 text-xs font-medium text-muted-foreground">
      {label}
    </span>
  );
}

function OperationalHistoryItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border bg-card px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm font-medium text-foreground">
        {value}
      </p>
    </div>
  );
}

function TemperatureBadge({ temperature }: { temperature: CrmTemperature }) {
  return (
    <span
      className={cn(
        "rounded-full border px-2 py-0.5 text-xs font-semibold",
        temperature === "quente"
          ? "border-[#d9a184] bg-[#f5e8df] text-[#9a4f32]"
          : temperature === "fria"
            ? "border-[#c8d4dc] bg-[#edf3f6] text-[#546977]"
            : "border-[#d9c28a] bg-[#f7f0df] text-[#80662f]",
      )}
    >
      {crmTemperatureLabels[temperature]}
    </span>
  );
}

function SimulationStatusBadge({
  status,
}: {
  status: CrmLeadSimulationStatus;
}) {
  return (
    <span
      className={cn(
        "w-fit rounded-full border px-2.5 py-1 text-xs font-semibold",
        status === "escolhida"
          ? "border-primary/25 bg-primary/5 text-primary"
          : status === "descartada"
            ? "border-[#c8d4dc] bg-[#edf3f6] text-[#546977]"
            : "border-[#d9c28a] bg-[#f7f0df] text-[#80662f]",
      )}
    >
      {simulationStatusLabels[status]}
    </span>
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

function formatDateTime(value: string) {
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? "-" : dateFormatter.format(date);
}
