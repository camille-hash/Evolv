"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Phone,
  Plus,
  Send,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CrmStructuredNotesList } from "@/components/crm/crm-structured-notes";
import {
  cancelCrmTask,
  completeCrmTask,
  createCrmTaskForLead,
  fetchCrmTasksForLead,
} from "@/modules/crm/client/crm-tasks-client";
import {
  crmPipelineLabels,
  crmPipelines,
  crmStageLabels,
  crmTemperatureLabels,
  buildWhatsappUrl,
  buildTemporaryStructuredNotesFromLead,
  getDefaultStageForPipeline,
  getStagesForPipeline,
  isStageInPipeline,
  resolveCrmLeadGreenFlags,
  resolveCrmLeadCommercialSignal,
  resolveCrmLeadOperationalPriority,
  type CrmCommercialSignal,
  type CrmLeadGreenFlag,
  type CrmLead,
  type CrmLeadInput,
  type CrmLeadNote,
  type CrmLeadSimulation,
  type CrmTask,
  type CrmTaskType,
  type CrmOperationalPriority,
  type CrmOperationalTimelineEvent,
  type CrmTimelineReadModel,
  type CrmPipeline,
  type CrmStage,
  type CrmStructuredNote,
} from "@/modules/crm";
import type { GeneratedProposalRecord } from "@/modules/proposal/proposal-history";
import { generateMultiCotasCommercialPdf } from "@/modules/reports";
import { cn } from "@/lib/utils";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  currency: "BRL",
  style: "currency",
});

const percentFormatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
  style: "percent",
});

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});
const taskDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
});

const fieldInputClass =
  "w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/15";
const defaultTaskType: CrmTaskType = "follow_up";

type TaskDraft = {
  dueDate: string;
  dueTime: string;
  notes: string;
  taskType: CrmTaskType;
  title: string;
};

type CrmLeadDetailProps = {
  draft: CrmLeadInput;
  feedbackMessage?: string | null;
  lead: CrmLead;
  onCancel: () => void;
  onClearFeedbackMessage?: () => void;
  onDraftChange: (draft: CrmLeadInput) => void;
  onGenerateMultiCotas?: (lead: CrmLead) => void;
  onGenerateSimulation?: (lead: CrmLead) => void;
  onSave: (event: FormEvent<HTMLFormElement>) => void;
  proposals: GeneratedProposalRecord[];
};

export function CrmLeadDetail({
  draft,
  feedbackMessage,
  lead,
  onCancel,
  onClearFeedbackMessage,
  onDraftChange,
  onGenerateMultiCotas,
  onGenerateSimulation,
  onSave,
  proposals,
}: CrmLeadDetailProps) {
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [isCompletingTask, setIsCompletingTask] = useState(false);
  const [isCancelingTask, setIsCancelingTask] = useState(false);
  const [noteContent, setNoteContent] = useState("");
  const [taskDraft, setTaskDraft] = useState<TaskDraft>(() =>
    createDefaultTaskDraft(),
  );
  const [noteError, setNoteError] = useState<string | null>(null);
  const [taskError, setTaskError] = useState<string | null>(null);
  const [noteSuccessMessage, setNoteSuccessMessage] = useState<string | null>(null);
  const [taskSuccessMessage, setTaskSuccessMessage] = useState<string | null>(null);
  const [notesState, setNotesState] = useState<{
    leadId: string;
    notes: CrmLeadNote[];
  } | null>(null);
  const [tasksState, setTasksState] = useState<{
    leadId: string;
    tasks: CrmTask[];
  } | null>(null);
  const [simulationsState, setSimulationsState] = useState<{
    leadId: string;
    simulations: CrmLeadSimulation[];
  } | null>(null);
  const [timelineState, setTimelineState] = useState<{
    leadId: string;
    timeline: CrmTimelineReadModel;
  } | null>(null);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [isLoadingSimulations, setIsLoadingSimulations] = useState(false);
  const [isLoadingTimeline, setIsLoadingTimeline] = useState(false);
  const [taskLoadError, setTaskLoadError] = useState<string | null>(null);
  const [taskActionError, setTaskActionError] = useState<string | null>(null);
  const [simulationsError, setSimulationsError] = useState<string | null>(null);
  const [timelineError, setTimelineError] = useState<string | null>(null);
  const leadDisplayName = useMemo(() => getLeadDisplayName(lead), [lead]);
  const whatsappUrl = buildWhatsappUrl(lead.telefone);
  const structuredNotes = buildTemporaryStructuredNotesFromLead(lead);
  const persistedNotes =
    notesState?.leadId === lead.id ? notesState.notes : [];
  const nextPendingTask = useMemo(
    () =>
      resolveNextPendingTask(
        tasksState?.leadId === lead.id ? tasksState.tasks : [],
      ),
    [lead.id, tasksState],
  );
  const persistedStructuredNotes = persistedNotes.map(mapLeadNoteToStructuredNote);
  const timelineEvents = useMemo(
    () =>
      timelineState?.leadId === lead.id ? timelineState.timeline.events : [],
    [lead.id, timelineState],
  );
  const leadSimulations = useMemo(
    () =>
      simulationsState?.leadId === lead.id
        ? simulationsState.simulations
        : [],
    [lead.id, simulationsState],
  );
  const commercialSimulations = leadSimulations.filter(
    (simulation) => simulation.simulationType === "commercial",
  );
  const multiCotasSimulations = leadSimulations
    .filter((simulation) => simulation.simulationType === "multi_cotas")
    .sort(sortLeadSimulationsByCreatedAtDesc);
  const latestMovement =
    persistedStructuredNotes[0] ?? structuredNotes.latestMovements[0];
  const commercialSignal = resolveCrmLeadCommercialSignal(lead);
  const operationalPriority = resolveCrmLeadOperationalPriority(lead);
  const greenFlags = useMemo(
    () =>
      resolveCrmLeadGreenFlags({
        simulations: leadSimulations,
        tasks: tasksState?.leadId === lead.id ? tasksState.tasks : null,
        timelineEvents,
      }),
    [lead.id, leadSimulations, tasksState, timelineEvents],
  );
  const leadObjective =
    lead.produtoInteresse ||
    lead.tituloOportunidade ||
    currencyFormatter.format(lead.valorPretendido);

  useEffect(() => {
    let isActive = true;

    async function loadNotes() {
      const accessToken = await readSupabaseAccessToken();

      if (!accessToken) {
        return;
      }

      const response = await fetch(`/api/crm/lead-notes?leadId=${lead.id}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }).catch(() => null);

      if (!response?.ok) {
        return;
      }

      const payload = (await response.json().catch(() => null)) as {
        notes?: CrmLeadNote[];
      } | null;

      if (isActive && Array.isArray(payload?.notes)) {
        setNotesState({
          leadId: lead.id,
          notes: payload.notes,
        });
      }
    }

    void loadNotes();

    return () => {
      isActive = false;
    };
  }, [lead.id]);

  useEffect(() => {
    let isActive = true;

    async function loadSimulations() {
      setIsLoadingSimulations(true);
      setSimulationsError(null);

      const accessToken = await readSupabaseAccessToken();

      if (!accessToken) {
        if (isActive) {
          setIsLoadingSimulations(false);
          setSimulationsError("Nao foi possivel carregar as simulacoes.");
        }
        return;
      }

      try {
        const simulations = await fetchLeadSimulations(accessToken, lead.id);

        if (isActive) {
          setSimulationsState({
            leadId: lead.id,
            simulations,
          });
        }
      } catch {
        if (isActive) {
          setSimulationsError("Nao foi possivel carregar as simulacoes.");
        }
      } finally {
        if (isActive) {
          setIsLoadingSimulations(false);
        }
      }
    }

    void loadSimulations();

    return () => {
      isActive = false;
    };
  }, [lead.id]);

  useEffect(() => {
    let isActive = true;

    async function loadTimeline() {
      setIsLoadingTimeline(true);
      setTimelineError(null);

      const accessToken = await readSupabaseAccessToken();

      if (!accessToken) {
        if (isActive) {
          setIsLoadingTimeline(false);
          setTimelineError("Nao foi possivel carregar a timeline agora.");
        }
        return;
      }

      try {
        const timeline = await fetchLeadTimeline(accessToken, lead.id);

        if (isActive) {
          setTimelineState({
            leadId: lead.id,
            timeline,
          });
        }
      } catch {
        if (isActive) {
          setTimelineError("Nao foi possivel carregar a timeline agora.");
        }
      } finally {
        if (isActive) {
          setIsLoadingTimeline(false);
        }
      }
    }

    void loadTimeline();

    return () => {
      isActive = false;
    };
  }, [lead.id]);

  useEffect(() => {
    let isActive = true;

    async function loadTasks() {
      setIsLoadingTasks(true);
      setTaskLoadError(null);
      setTaskActionError(null);

      const accessToken = await readSupabaseAccessToken();

      if (!accessToken) {
        if (isActive) {
          setIsLoadingTasks(false);
        }
        return;
      }

      try {
        const tasks = await fetchCrmTasksForLead(accessToken, lead.id);

        if (isActive) {
          setTasksState({
            leadId: lead.id,
            tasks,
          });
        }
      } catch {
        if (isActive) {
          setTaskLoadError("Nao foi possivel carregar as tarefas.");
        }
      } finally {
        if (isActive) {
          setIsLoadingTasks(false);
        }
      }
    }

    void loadTasks();

    return () => {
      isActive = false;
    };
  }, [lead.id]);

  useEffect(() => {
    if (!noteSuccessMessage) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setNoteSuccessMessage(null);
    }, 3000);

    return () => window.clearTimeout(timeoutId);
  }, [noteSuccessMessage]);

  useEffect(() => {
    if (!taskSuccessMessage) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setTaskSuccessMessage(null);
    }, 3000);

    return () => window.clearTimeout(timeoutId);
  }, [taskSuccessMessage]);

  useEffect(() => {
    if (!feedbackMessage || !onClearFeedbackMessage) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      onClearFeedbackMessage();
    }, 3000);

    return () => window.clearTimeout(timeoutId);
  }, [feedbackMessage, onClearFeedbackMessage]);

  function updateDraft(patch: Partial<CrmLeadInput>) {
    onDraftChange({
      ...draft,
      ...patch,
    });
  }

  function handlePipelineChange(pipeline: CrmPipeline) {
    updateDraft({
      pipeline,
      etapa: isStageInPipeline(pipeline, draft.etapa)
        ? draft.etapa
        : getDefaultStageForPipeline(pipeline),
    });
  }

  function handleOpenWhatsapp() {
    if (!whatsappUrl) {
      return;
    }

    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  }

  function handleOpenNoteModal() {
    setNoteError(null);
    setNoteSuccessMessage(null);
    setIsNoteModalOpen(true);
  }

  function handleOpenTaskModal() {
    setTaskDraft(createDefaultTaskDraft());
    setTaskError(null);
    setTaskActionError(null);
    setTaskSuccessMessage(null);
    setIsTaskModalOpen(true);
  }

  function handleCloseNoteModal() {
    if (isSavingNote) {
      return;
    }

    setIsNoteModalOpen(false);
    setNoteError(null);
  }

  function handleCloseTaskModal() {
    if (isCreatingTask) {
      return;
    }

    setIsTaskModalOpen(false);
    setTaskError(null);
  }

  function updateTaskDraft(patch: Partial<TaskDraft>) {
    setTaskDraft((current) => ({
      ...current,
      ...patch,
    }));
  }

  function handleTaskTypeChange(taskType: CrmTaskType) {
    setTaskDraft((current) => {
      const currentDefaultTitle = getDefaultTaskTitle(current.taskType);
      const shouldReplaceTitle =
        !current.title.trim() || current.title === currentDefaultTitle;

      return {
        ...current,
        taskType,
        title: shouldReplaceTitle
          ? getDefaultTaskTitle(taskType)
          : current.title,
      };
    });
  }

  async function refreshLeadTimeline(accessToken: string, leadId: string) {
    try {
      const timeline = await fetchLeadTimeline(accessToken, leadId);

      setTimelineState({
        leadId,
        timeline,
      });
      setTimelineError(null);
    } catch {
      setTimelineError("Nao foi possivel carregar a timeline agora.");
    }
  }

  async function handleSaveNote() {
    const content = noteContent.trim();

    if (!content) {
      setNoteError("Escreva uma observacao interna antes de salvar.");
      return;
    }

    setIsSavingNote(true);
    setNoteError(null);

    try {
      const accessToken = await readSupabaseAccessToken();

      if (!accessToken) {
        throw new Error("Sessao indisponivel.");
      }

      const response = await fetch("/api/crm/lead-notes", {
        body: JSON.stringify({
          content,
          leadId: lead.id,
        }),
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        note?: CrmLeadNote;
      } | null;

      if (!response.ok || !payload?.note) {
        throw new Error(payload?.error ?? "Nao foi possivel salvar a nota.");
      }

      setNotesState({
        leadId: lead.id,
        notes: [payload.note, ...persistedNotes],
      });
      await refreshLeadTimeline(accessToken, lead.id);
      setNoteContent("");
      setIsHistoryOpen(true);
      setIsNoteModalOpen(false);
      setNoteSuccessMessage("Nota adicionada com sucesso.");
    } catch (error) {
      setNoteError(
        error instanceof Error
          ? error.message
          : "Nao foi possivel salvar a nota.",
      );
    } finally {
      setIsSavingNote(false);
    }
  }

  async function handleCreateTask() {
    const title = taskDraft.title.trim();

    if (!taskDraft.taskType) {
      setTaskError("Tipo da acao e obrigatorio.");
      return;
    }

    if (!title) {
      setTaskError("Titulo e obrigatorio.");
      return;
    }

    if (!taskDraft.dueDate) {
      setTaskError("Data da acao e obrigatoria.");
      return;
    }

    setIsCreatingTask(true);
    setTaskError(null);

    try {
      const accessToken = await readSupabaseAccessToken();

      if (!accessToken) {
        throw new Error("Sessao invalida.");
      }

      const task = await createCrmTaskForLead(accessToken, {
        dueDate: taskDraft.dueDate,
        dueTime: taskDraft.dueTime || undefined,
        leadId: lead.id,
        notes: taskDraft.notes || undefined,
        taskType: taskDraft.taskType,
        title,
      });

      setTasksState((current) => ({
        leadId: lead.id,
        tasks:
          current?.leadId === lead.id
            ? [task, ...current.tasks.filter((item) => item.id !== task.id)]
            : [task],
      }));
      await refreshLeadTimeline(accessToken, lead.id);
      setIsTaskModalOpen(false);
      setTaskDraft(createDefaultTaskDraft());
      setTaskActionError(null);
      setTaskSuccessMessage("Acao criada com sucesso.");
    } catch (error) {
      setTaskError(
        error instanceof Error
          ? error.message
          : "Nao foi possivel criar a acao.",
      );
    } finally {
      setIsCreatingTask(false);
    }
  }

  async function handleCompleteTask(task: CrmTask) {
    if (isCompletingTask || isCancelingTask) {
      return;
    }

    setIsCompletingTask(true);
    setTaskActionError(null);
    setTaskLoadError(null);
    setTaskSuccessMessage(null);

    try {
      const accessToken = await readSupabaseAccessToken();

      if (!accessToken) {
        throw new Error("Sessao invalida.");
      }

      await completeCrmTask(accessToken, task.id);

      const tasks = await fetchCrmTasksForLead(accessToken, lead.id);

      setTasksState({
        leadId: lead.id,
        tasks,
      });
      await refreshLeadTimeline(accessToken, lead.id);
      setTaskSuccessMessage("Acao concluida.");
    } catch (error) {
      setTaskActionError(
        error instanceof Error
          ? error.message
          : "Nao foi possivel concluir a acao.",
      );
    } finally {
      setIsCompletingTask(false);
    }
  }

  async function handleCancelTask(task: CrmTask) {
    if (isCompletingTask || isCancelingTask) {
      return;
    }

    setIsCancelingTask(true);
    setTaskActionError(null);
    setTaskLoadError(null);
    setTaskSuccessMessage(null);

    try {
      const accessToken = await readSupabaseAccessToken();

      if (!accessToken) {
        throw new Error("Sessao invalida.");
      }

      await cancelCrmTask(accessToken, task.id);

      const tasks = await fetchCrmTasksForLead(accessToken, lead.id);

      setTasksState({
        leadId: lead.id,
        tasks,
      });
      await refreshLeadTimeline(accessToken, lead.id);
      setTaskSuccessMessage("Acao cancelada.");
    } catch (error) {
      setTaskActionError(
        error instanceof Error
          ? error.message
          : "Nao foi possivel cancelar a acao.",
      );
    } finally {
      setIsCancelingTask(false);
    }
  }

  return (
    <section className="grid gap-4">
      <section className="executive-surface rounded-md p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Dossie executivo
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-foreground">
              {leadDisplayName}
            </h2>
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium">
              <span className="rounded-full border bg-background px-2 py-1 text-muted-foreground">
                {crmPipelineLabels[lead.pipeline]}
              </span>
              <span className="rounded-full border bg-background px-2 py-1 text-muted-foreground">
                {crmStageLabels[lead.etapa]}
              </span>
              <span className="rounded-full border bg-background px-2 py-1 text-muted-foreground">
                {currencyFormatter.format(lead.valorPretendido)}
              </span>
              <CommercialSignalBadge
                signal={commercialSignal.signal}
                summary={commercialSignal.summary}
              >
                Sinal comercial: {commercialSignal.label}
              </CommercialSignalBadge>
              <OperationalPriorityBadge
                priority={operationalPriority.priority}
                summary={operationalPriority.summary}
              >
                Prioridade operacional: {operationalPriority.label}
              </OperationalPriorityBadge>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {commercialSignal.summary} - {operationalPriority.summary}
            </p>
          </div>

          <Button onClick={onCancel} type="button" variant="ghost">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Voltar ao pipeline
          </Button>
        </div>
      </section>

      <form className="grid gap-4" onSubmit={onSave}>
        {feedbackMessage ? (
          <SuccessFeedback message={feedbackMessage} />
        ) : null}

        {noteSuccessMessage ? (
          <SuccessFeedback message={noteSuccessMessage} />
        ) : null}

        {taskSuccessMessage ? (
          <SuccessFeedback message={taskSuccessMessage} />
        ) : null}

        <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <ExecutiveDossierCard
            description="Dados estaveis para entender rapidamente quem esta do outro lado."
            eyebrow="Quem e"
            title={leadDisplayName}
          >
            <div className="grid gap-3 text-sm md:grid-cols-2">
              <LeadInfo label="Telefone" value={lead.telefone || "-"} />
              <LeadInfo label="E-mail" value={lead.email || "-"} />
              <LeadInfo label="Origem" value={lead.origem || "-"} />
              <LeadInfo label="Cidade / Pais" value={lead.pais || "-"} />
              <LeadInfo label="Objetivo comercial" value={leadObjective} />
              <LeadInfo
                label="Credito desejado"
                value={currencyFormatter.format(lead.valorPretendido)}
              />
            </div>
          </ExecutiveDossierCard>

          <ExecutiveDossierCard
            description="Primeira leitura do relacionamento, derivada temporariamente das informacoes atuais."
            eyebrow="Relacionamento"
            title="Contexto Estrategico"
          >
            <CrmStructuredNotesList
              emptyText="Nenhum contexto estrategico registrado ainda."
              notes={structuredNotes.strategicContext}
            />
          </ExecutiveDossierCard>
        </div>

        <div className="grid gap-4 xl:grid-cols-[0.95fr_0.95fr_1.1fr]">
          <ExecutiveDossierCard
            description="Um unico sinal recente para leitura rapida."
            eyebrow="Agora"
            title="Ultima Movimentacao"
          >
            {latestMovement ? (
              <div className="rounded-md border bg-background/70 p-4 text-sm">
                <p className="leading-6 text-foreground">
                  {latestMovement.content}
                </p>
                <p className="mt-3 text-xs text-muted-foreground">
                  {dateFormatter.format(new Date(latestMovement.timestamp))}
                </p>
              </div>
            ) : (
              <p className="rounded-md border border-dashed bg-background/60 p-4 text-sm text-muted-foreground">
                Nenhuma movimentacao recente disponivel.
              </p>
            )}
          </ExecutiveDossierCard>

          <ExecutiveDossierCard
            description="Primeira leitura da tarefa comercial pendente deste lead."
            eyebrow="Acao"
            title="Proxima Acao"
          >
            <div className="rounded-md border bg-background/70 p-4 text-sm">
              {isLoadingTasks ? (
                <p className="text-sm text-muted-foreground">
                  Carregando proxima acao...
                </p>
              ) : taskLoadError ? (
                <>
                  <p className="font-medium text-foreground">
                    Sem proxima acao
                  </p>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">
                    {taskLoadError}
                  </p>
                </>
              ) : nextPendingTask ? (
                <TaskNextAction
                  isCanceling={isCancelingTask}
                  isCompleting={isCompletingTask}
                  onCancelTask={handleCancelTask}
                  onCompleteTask={handleCompleteTask}
                  onCreateTask={handleOpenTaskModal}
                  task={nextPendingTask}
                />
              ) : (
                <>
                  <p className="font-medium text-foreground">
                    Sem proxima acao
                  </p>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">
                    Nenhuma acao programada.
                  </p>
                  <div className="mt-4">
                    <Button
                      onClick={handleOpenTaskModal}
                      type="button"
                      variant="secondary"
                    >
                      <Plus className="h-4 w-4" aria-hidden />
                      Criar proxima acao
                    </Button>
                  </div>
                </>
              )}
              {taskActionError ? (
                <p className="mt-3 text-xs leading-5 text-destructive">
                  {taskActionError}
                </p>
              ) : null}
            </div>
            <div className="mt-4 grid gap-3 text-sm">
              <LeadInfo label="Responsavel" value={lead.consultor || "-"} />
              <LeadInfo
                label="Valor desejado"
                value={currencyFormatter.format(lead.valorPretendido)}
              />
            </div>
          </ExecutiveDossierCard>

          <ExecutiveDossierCard
            description="Acoes comerciais existentes, sem mudanca de comportamento."
            eyebrow="Atalhos"
            title="Acoes Comerciais"
          >
            <div className="mt-4 grid gap-2">
              <Button
                disabled={!onGenerateSimulation}
                onClick={() => onGenerateSimulation?.(lead)}
                type="button"
                variant="secondary"
              >
                <Plus className="h-4 w-4" aria-hidden />
                Gerar simulacao
              </Button>
              <Button
                disabled={!onGenerateMultiCotas}
                onClick={() => onGenerateMultiCotas?.(lead)}
                type="button"
                variant="secondary"
              >
                <Plus className="h-4 w-4" aria-hidden />
                Gerar Multi-Cotas
              </Button>
              <Button disabled type="button" variant="secondary">
                <Plus className="h-4 w-4" aria-hidden />
                Gerar proposta
              </Button>
              <Button disabled type="button" variant="ghost">
                <Phone className="h-4 w-4" aria-hidden />
                Ligar
              </Button>
              <Button
                disabled={!whatsappUrl}
                onClick={handleOpenWhatsapp}
                type="button"
                variant="ghost"
              >
                <Send className="h-4 w-4" aria-hidden />
                WhatsApp
              </Button>
            </div>
          </ExecutiveDossierCard>
        </div>

        <ExecutiveDossierCard
          description="Sinais explicaveis derivados das atividades e artefatos ja registrados."
          eyebrow="Inteligencia"
          title="Check Points"
        >
          <LeadGreenFlags flags={greenFlags} />
        </ExecutiveDossierCard>

        <ExecutiveDossierCard
          description="Simulacoes comerciais vinculadas a este lead."
          eyebrow="Simulacoes"
          title="Simulacoes Salvas"
        >
          <LeadSimulationHistoryList
            error={simulationsError}
            isLoading={isLoadingSimulations}
            simulations={commercialSimulations}
          />
        </ExecutiveDossierCard>

        <ExecutiveDossierCard
          description="Historico de estudos Multi-Cotas vinculados a este lead."
          eyebrow="Estrategia"
          title="Multi-Cotas"
        >
          <LeadMultiCotasSummary
            error={simulationsError}
            isLoading={isLoadingSimulations}
            leadName={leadDisplayName}
            simulations={multiCotasSimulations}
          />
        </ExecutiveDossierCard>

        <section className="executive-surface rounded-md p-5 text-card-foreground">
          <button
            aria-expanded={isHistoryOpen}
            className="flex w-full items-start justify-between gap-4 text-left"
            onClick={() => setIsHistoryOpen((current) => !current)}
            type="button"
          >
            <span>
              <span className="block text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Timeline
              </span>
              <span className="mt-1 block text-sm font-semibold text-foreground">
                Timeline Operacional
              </span>
              <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                Notas e tarefas recentes deste lead, com autoria e horario.
              </span>
            </span>
            {isHistoryOpen ? (
              <ChevronUp className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
            ) : (
              <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
            )}
          </button>
          <div className="mt-4 flex justify-end">
            <Button onClick={handleOpenNoteModal} type="button" variant="secondary">
              <Plus className="h-4 w-4" aria-hidden />
              Adicionar Nota
            </Button>
          </div>
          {isHistoryOpen ? (
            <div className="mt-4">
              <CrmOperationalTimelineList
                error={timelineError}
                events={timelineEvents}
                isLoading={isLoadingTimeline}
              />
            </div>
          ) : null}
        </section>

        <div className="grid gap-4 xl:grid-cols-[1fr_1.2fr]">
          <ExecutiveDossierCard
            description="Ajustes operacionais do lead, preservando os campos existentes."
            eyebrow="Edicao"
            title="Dados Comerciais"
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Nome">
                <input
                  className={fieldInputClass}
                  onChange={(event) => updateDraft({ nome: event.target.value })}
                  placeholder="Nome do lead"
                  required
                  value={draft.nome}
                />
              </Field>

              <Field label="Telefone">
                <input
                  className={fieldInputClass}
                  onChange={(event) =>
                    updateDraft({ telefone: event.target.value })
                  }
                  placeholder="(00) 00000-0000"
                  value={draft.telefone}
                />
              </Field>

              <Field label="E-mail">
                <input
                  className={fieldInputClass}
                  onChange={(event) => updateDraft({ email: event.target.value })}
                  placeholder="cliente@email.com"
                  type="email"
                  value={draft.email}
                />
              </Field>

              <Field label="Origem">
                <input
                  className={fieldInputClass}
                  onChange={(event) => updateDraft({ origem: event.target.value })}
                  placeholder="Indicacao, trafego, evento..."
                  value={draft.origem}
                />
              </Field>

              <Field label="Consultor">
                <input
                  className={fieldInputClass}
                  onChange={(event) =>
                    updateDraft({ consultor: event.target.value })
                  }
                  placeholder="Responsavel"
                  value={draft.consultor}
                />
              </Field>

              <Field label="Valor / credito desejado">
                <input
                  className={fieldInputClass}
                  min={0}
                  onChange={(event) =>
                    updateDraft({ valorPretendido: Number(event.target.value) })
                  }
                  type="number"
                  value={draft.valorPretendido}
                />
              </Field>

              <Field label="Funil">
                <select
                  className={fieldInputClass}
                  onChange={(event) =>
                    handlePipelineChange(event.target.value as CrmPipeline)
                  }
                  value={draft.pipeline}
                >
                  {crmPipelines.map((pipeline) => (
                    <option key={pipeline.key} value={pipeline.key}>
                      {pipeline.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Temperatura">
                <select
                  className={fieldInputClass}
                  onChange={(event) =>
                    updateDraft({
                      temperatura: event.target.value as CrmLeadInput["temperatura"],
                    })
                  }
                  value={draft.temperatura}
                >
                  {Object.entries(crmTemperatureLabels).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Etapa">
                <select
                  className={fieldInputClass}
                  onChange={(event) =>
                    updateDraft({ etapa: event.target.value as CrmStage })
                  }
                  value={draft.etapa}
                >
                  {getStagesForPipeline(draft.pipeline).map((stage) => (
                    <option key={stage.key} value={stage.key}>
                      {stage.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Observacoes atuais">
              <textarea
                className={cn(fieldInputClass, "min-h-32 resize-y")}
                onChange={(event) =>
                  updateDraft({ observacoes: event.target.value })
                }
                placeholder="Perfil, objetivos, objecoes, contexto familiar e combinados."
                value={draft.observacoes}
              />
            </Field>
          </ExecutiveDossierCard>

          <ExecutiveDossierCard
            description="Artefatos comerciais ja existentes no EVOLV."
            eyebrow="Card 6"
            title="Propostas e Simulacoes"
          >
            <div className="grid gap-3">
              {proposals.length ? (
                proposals.map((proposal) => (
                  <GeneratedProposalItem
                    key={`${proposal.generatedAt}-${proposal.fileName ?? "pdf"}`}
                    proposal={proposal}
                  />
                ))
              ) : (
                <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                  Nenhuma proposta gerada nesta sessao.
                </p>
              )}
            </div>
          </ExecutiveDossierCard>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button type="submit">
            <Plus className="h-4 w-4" aria-hidden />
            Salvar lead
          </Button>
          <Button onClick={onCancel} type="button" variant="ghost">
            Cancelar edicao
          </Button>
        </div>
      </form>

      {isNoteModalOpen ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4"
          role="dialog"
        >
          <div className="w-full max-w-lg rounded-md border bg-background p-5 shadow-xl">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Nota interna
              </p>
              <h3 className="mt-1 text-lg font-semibold text-foreground">
                Adicionar Nota
              </h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Registre uma observacao interna para manter o contexto comercial
                do lead.
              </p>
            </div>

            <label className="mt-5 grid gap-2 text-sm font-medium text-foreground">
              <span>Observacao interna</span>
              <textarea
                className={cn(fieldInputClass, "min-h-36 resize-y")}
                disabled={isSavingNote}
                onChange={(event) => setNoteContent(event.target.value)}
                placeholder="Ex.: cliente pediu retorno apos reuniao com a familia."
                value={noteContent}
              />
            </label>

            {noteError ? (
              <p className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {noteError}
              </p>
            ) : null}

            <div className="mt-5 flex flex-wrap justify-end gap-3">
              <Button
                disabled={isSavingNote}
                onClick={handleCloseNoteModal}
                type="button"
                variant="ghost"
              >
                Cancelar
              </Button>
              <Button
                disabled={isSavingNote || !noteContent.trim()}
                onClick={handleSaveNote}
                type="button"
              >
                {isSavingNote ? "Salvando..." : "Salvar Nota"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {isTaskModalOpen ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4"
          role="dialog"
        >
          <div className="w-full max-w-lg rounded-md border bg-background p-5 shadow-xl">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Tarefa comercial
              </p>
              <h3 className="mt-1 text-lg font-semibold text-foreground">
                Criar proxima acao
              </h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Defina uma tarefa comercial clara para este lead.
              </p>
            </div>

            <div className="mt-5 grid gap-4">
              <Field label="Tipo da acao">
                <select
                  className={fieldInputClass}
                  disabled={isCreatingTask}
                  onChange={(event) =>
                    handleTaskTypeChange(event.target.value as CrmTaskType)
                  }
                  value={taskDraft.taskType}
                >
                  {taskTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Titulo">
                <input
                  className={fieldInputClass}
                  disabled={isCreatingTask}
                  onChange={(event) =>
                    updateTaskDraft({ title: event.target.value })
                  }
                  placeholder="Ex.: fazer follow-up"
                  value={taskDraft.title}
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Data">
                  <input
                    className={fieldInputClass}
                    disabled={isCreatingTask}
                    onChange={(event) =>
                      updateTaskDraft({ dueDate: event.target.value })
                    }
                    type="date"
                    value={taskDraft.dueDate}
                  />
                </Field>

                <Field label="Horario">
                  <input
                    className={fieldInputClass}
                    disabled={isCreatingTask}
                    onChange={(event) =>
                      updateTaskDraft({ dueTime: event.target.value })
                    }
                    type="time"
                    value={taskDraft.dueTime}
                  />
                </Field>
              </div>

              <Field label="Observacao">
                <textarea
                  className={cn(fieldInputClass, "min-h-24 resize-y")}
                  disabled={isCreatingTask}
                  onChange={(event) =>
                    updateTaskDraft({ notes: event.target.value })
                  }
                  placeholder="Contexto rapido para executar esta acao."
                  value={taskDraft.notes}
                />
              </Field>
            </div>

            {taskError ? (
              <p className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {taskError}
              </p>
            ) : null}

            <div className="mt-5 flex flex-wrap justify-end gap-3">
              <Button
                disabled={isCreatingTask}
                onClick={handleCloseTaskModal}
                type="button"
                variant="ghost"
              >
                Cancelar
              </Button>
              <Button
                disabled={isCreatingTask}
                onClick={handleCreateTask}
                type="button"
              >
                {isCreatingTask ? "Criando..." : "Criar acao"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

async function readSupabaseAccessToken() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !publishableKey) {
    return null;
  }

  const supabase = createClient(supabaseUrl, publishableKey, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: true,
      persistSession: true,
    },
  });
  const { data, error } = await supabase.auth.getSession();

  if (error || !data.session?.access_token) {
    return null;
  }

  return data.session.access_token;
}

function mapLeadNoteToStructuredNote(note: CrmLeadNote): CrmStructuredNote {
  return {
    author: "EVOLV",
    content: note.content,
    id: note.id,
    kind: "history",
    timestamp: note.createdAt,
  };
}

async function fetchLeadTimeline(accessToken: string, leadId: string) {
  const response = await fetch(`/api/crm/lead-timeline?leadId=${leadId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const payload = (await response.json().catch(() => null)) as {
    error?: string;
    timeline?: CrmTimelineReadModel;
  } | null;

  if (!response.ok || !payload?.timeline) {
    throw new Error(payload?.error ?? "Nao foi possivel carregar a timeline agora.");
  }

  return payload.timeline;
}

async function fetchLeadSimulations(accessToken: string, leadId: string) {
  const response = await fetch(
    `/api/crm/lead-simulations?leadId=${encodeURIComponent(leadId)}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  const payload = (await response.json().catch(() => null)) as {
    error?: string;
    simulations?: CrmLeadSimulation[];
  } | null;

  if (!response.ok || !Array.isArray(payload?.simulations)) {
    throw new Error(payload?.error ?? "Nao foi possivel carregar as simulacoes.");
  }

  return payload.simulations;
}

function getLeadDisplayName(lead: Pick<CrmLead, "nome" | "telefone" | "email">) {
  const normalizedName =
    typeof lead.nome === "string" ? lead.nome.trim() : "";

  if (
    normalizedName &&
    normalizedName.toLowerCase() !== "undefined" &&
    normalizedName.toLowerCase() !== "null"
  ) {
    return normalizedName;
  }

  const fallbackReference = lead.telefone?.trim() || lead.email?.trim() || "";

  return fallbackReference
    ? `Lead sem nome (${fallbackReference})`
    : "Lead sem nome";
}

function resolveNextPendingTask(tasks: CrmTask[]) {
  return tasks
    .filter((task) => task.status === "pending")
    .sort(compareTasksByDueDate)[0] ?? null;
}

function compareTasksByDueDate(first: CrmTask, second: CrmTask) {
  const firstDate = `${first.dueDate}T${first.dueTime ?? "23:59:59"}`;
  const secondDate = `${second.dueDate}T${second.dueTime ?? "23:59:59"}`;

  if (firstDate !== secondDate) {
    return firstDate.localeCompare(secondDate);
  }

  return first.createdAt.localeCompare(second.createdAt);
}

function TaskNextAction({
  isCanceling,
  isCompleting,
  onCancelTask,
  onCompleteTask,
  onCreateTask,
  task,
}: {
  isCanceling: boolean;
  isCompleting: boolean;
  onCancelTask: (task: CrmTask) => void;
  onCompleteTask: (task: CrmTask) => void;
  onCreateTask: () => void;
  task: CrmTask;
}) {
  const isMutating = isCompleting || isCanceling;

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        <span className="rounded-full border bg-background px-2 py-1 text-xs font-medium text-muted-foreground">
          {getTaskDueStatusLabel(task)}
        </span>
        <span className="rounded-full border bg-background px-2 py-1 text-xs font-medium text-muted-foreground">
          {getTaskTypeLabel(task.taskType)}
        </span>
        <span className="rounded-full border bg-background px-2 py-1 text-xs font-medium text-muted-foreground">
          Pendente
        </span>
      </div>
      <div>
        <p className="font-medium text-foreground">{task.title}</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          {formatTaskDueDate(task)}
        </p>
      </div>
      {task.notes ? (
        <p className="rounded-md border border-dashed bg-background/60 p-3 text-xs leading-5 text-muted-foreground">
          {task.notes}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button
          disabled={isMutating}
          onClick={() => onCompleteTask(task)}
          type="button"
        >
          <CheckCircle2 className="h-4 w-4" aria-hidden />
          {isCompleting ? "Concluindo..." : "Concluir acao"}
        </Button>
        <Button
          disabled={isMutating}
          onClick={() => onCancelTask(task)}
          type="button"
          variant="ghost"
        >
          <XCircle className="h-4 w-4" aria-hidden />
          {isCanceling ? "Cancelando..." : "Cancelar acao"}
        </Button>
        <Button
          disabled={isMutating}
          onClick={onCreateTask}
          type="button"
          variant="secondary"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Nova acao
        </Button>
      </div>
    </div>
  );
}

const taskTypeOptions: Array<{ label: string; value: CrmTaskType }> = [
  { label: "Ligar", value: "call" },
  { label: "WhatsApp", value: "whatsapp" },
  { label: "Enviar simulacao", value: "send_simulation" },
  { label: "Enviar proposta", value: "send_proposal" },
  { label: "Agendar reuniao", value: "schedule_meeting" },
  { label: "Solicitar documentacao", value: "request_documents" },
  { label: "Follow-up", value: "follow_up" },
  { label: "Outro", value: "other" },
];

function createDefaultTaskDraft(): TaskDraft {
  return {
    dueDate: getLocalDateKey(new Date()),
    dueTime: "",
    notes: "",
    taskType: defaultTaskType,
    title: getDefaultTaskTitle(defaultTaskType),
  };
}

function getDefaultTaskTitle(taskType: CrmTaskType) {
  const titles: Record<CrmTaskType, string> = {
    call: "Entrar em contato",
    follow_up: "Fazer follow-up",
    other: "",
    request_documents: "Solicitar documentacao",
    schedule_meeting: "Agendar reuniao",
    send_proposal: "Enviar proposta",
    send_simulation: "Enviar simulacao",
    whatsapp: "Enviar WhatsApp",
  };

  return titles[taskType];
}

function getTaskTypeLabel(taskType: CrmTaskType) {
  const labels: Record<CrmTaskType, string> = {
    call: "Ligar",
    follow_up: "Follow-up",
    other: "Outro",
    request_documents: "Solicitar documentacao",
    schedule_meeting: "Agendar reuniao",
    send_proposal: "Enviar proposta",
    send_simulation: "Enviar simulacao",
    whatsapp: "WhatsApp",
  };

  return labels[taskType];
}

function getTaskDueStatusLabel(task: CrmTask) {
  const today = getLocalDateKey(new Date());

  if (task.dueDate < today) {
    return "Atrasada";
  }

  if (task.dueDate === today) {
    return "Hoje";
  }

  return "Agendada";
}

function formatTaskDueDate(task: CrmTask) {
  const [year, month, day] = task.dueDate.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const formattedDate = taskDateFormatter.format(date);

  return task.dueTime
    ? `${formattedDate} as ${task.dueTime.slice(0, 5)}`
    : formattedDate;
}

function getLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function SuccessFeedback({ message }: { message: string }) {
  return (
    <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
      {message}
    </p>
  );
}

function CrmOperationalTimelineList({
  error,
  events,
  isLoading,
}: {
  error: string | null;
  events: CrmOperationalTimelineEvent[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <p className="rounded-md border border-dashed bg-background/60 p-4 text-sm text-muted-foreground">
        Carregando timeline...
      </p>
    );
  }

  if (error) {
    return (
      <p className="rounded-md border border-dashed bg-background/60 p-4 text-sm text-muted-foreground">
        {error}
      </p>
    );
  }

  if (!events.length) {
    return (
      <p className="rounded-md border border-dashed bg-background/60 p-4 text-sm text-muted-foreground">
        Nenhum evento operacional registrado ainda.
      </p>
    );
  }

  return (
    <div className="grid gap-3">
      {events.map((event) => (
        <article
          className={cn(
            "rounded-md border bg-background/70 p-4 text-sm",
            timelineEventToneClassNames[event.type],
          )}
          key={event.id}
        >
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">
              {event.authorName}
            </span>
            <span aria-hidden>-</span>
            <time dateTime={event.occurredAt}>
              {dateFormatter.format(new Date(event.occurredAt))}
            </time>
            <span aria-hidden>-</span>
            <span className="rounded-full border bg-background px-2 py-0.5 font-medium">
              {timelineEventTypeLabels[event.type]}
            </span>
          </div>
          <div className="mt-3">
            <p className="font-medium text-foreground">{event.title}</p>
            {event.description ? (
              <p className="mt-1 leading-6 text-foreground/85">
                {event.description}
              </p>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
}

function LeadSimulationHistoryList({
  error,
  isLoading,
  simulations,
}: {
  error: string | null;
  isLoading: boolean;
  simulations: CrmLeadSimulation[];
}) {
  const [selectedSimulationId, setSelectedSimulationId] = useState<string | null>(
    null,
  );
  const selectedSimulation =
    simulations.find((simulation) => simulation.id === selectedSimulationId) ??
    null;

  if (isLoading) {
    return (
      <p className="rounded-md border bg-background/70 p-4 text-sm text-muted-foreground">
        Carregando simulacoes...
      </p>
    );
  }

  if (error) {
    return (
      <p className="rounded-md border border-dashed bg-background/60 p-4 text-sm text-muted-foreground">
        {error}
      </p>
    );
  }

  if (!simulations.length) {
    return (
      <p className="rounded-md border border-dashed bg-background/60 p-4 text-sm text-muted-foreground">
        Nenhuma simulacao salva neste lead.
      </p>
    );
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {simulations.map((simulation) => (
          <LeadSimulationHistoryItem
            isSelected={simulation.id === selectedSimulationId}
            key={simulation.id}
            onSelect={() =>
              setSelectedSimulationId((current) =>
                current === simulation.id ? null : simulation.id,
              )
            }
            simulation={simulation}
          />
        ))}
      </div>
      {selectedSimulation ? (
        <LeadSimulationReadDetail
          onClose={() => setSelectedSimulationId(null)}
          simulation={selectedSimulation}
        />
      ) : (
        <p className="rounded-md border border-dashed bg-background/60 p-4 text-sm text-muted-foreground">
          Selecione uma simulacao para ver os detalhes salvos.
        </p>
      )}
    </div>
  );
}

function LeadSimulationHistoryItem({
  isSelected,
  onSelect,
  simulation,
}: {
  isSelected: boolean;
  onSelect: () => void;
  simulation: CrmLeadSimulation;
}) {
  const credit =
    simulation.commercialCredit ??
    simulation.updatedCredit ??
    simulation.totalCredit;
  const installment = simulation.monthlyPayment;

  return (
    <article
      className={cn(
        "rounded-md border bg-background/70 p-4 text-sm",
        isSelected ? "border-primary/50 bg-primary/[0.04]" : "",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">
            {simulation.title}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {leadSimulationTypeLabels[simulation.simulationType]}
          </p>
        </div>
        <span className="shrink-0 rounded-full border bg-card px-2 py-1 text-[11px] font-medium text-muted-foreground">
          {dateFormatter.format(new Date(simulation.createdAt))}
        </span>
      </div>
      <div className="mt-4 grid gap-2 md:grid-cols-2">
        <LeadInfo
          label="Credito"
          value={typeof credit === "number" ? currencyFormatter.format(credit) : "-"}
        />
        <LeadInfo
          label="Parcela"
          value={
            typeof installment === "number"
              ? currencyFormatter.format(installment)
              : "-"
          }
        />
        <LeadInfo
          label="Contemplacao"
          value={
            typeof simulation.contemplationMonth === "number"
              ? `Mes ${simulation.contemplationMonth}`
              : "-"
          }
        />
        <LeadInfo
          label="Criada em"
          value={dateFormatter.format(new Date(simulation.createdAt))}
        />
      </div>
      <div className="mt-4">
        <Button onClick={onSelect} type="button" variant="secondary">
          {isSelected ? "Fechar detalhe" : "Ver detalhes"}
        </Button>
      </div>
    </article>
  );
}

function LeadGreenFlags({ flags }: { flags: CrmLeadGreenFlag[] }) {
  if (!flags.length) {
    return (
      <p className="rounded-md border border-dashed bg-background/60 p-4 text-sm text-muted-foreground">
        Nenhum Check Point identificado.
      </p>
    );
  }

  return (
    <ul className="grid gap-2">
      {flags.map((flag) => (
        <li
          className="flex items-start gap-2 rounded-md border bg-background/70 px-3 py-2 text-sm text-foreground"
          key={flag.type}
        >
          <CheckCircle2
            aria-hidden
            className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600"
          />
          <span>{flag.description}</span>
        </li>
      ))}
    </ul>
  );
}

function LeadMultiCotasSummary({
  error,
  isLoading,
  leadName,
  simulations,
}: {
  error: string | null;
  isLoading: boolean;
  leadName: string;
  simulations: CrmLeadSimulation[];
}) {
  const [selectedSimulationId, setSelectedSimulationId] = useState<string | null>(
    null,
  );
  const selectedSimulation =
    simulations.find((simulation) => simulation.id === selectedSimulationId) ??
    null;

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Carregando estudos...</p>;
  }

  if (error) {
    return <p className="text-sm text-muted-foreground">{error}</p>;
  }

  if (!simulations.length) {
    return (
      <p className="rounded-md border border-dashed bg-background/60 p-4 text-sm text-muted-foreground">
        Nenhum estudo Multi-Cotas salvo para este lead.
      </p>
    );
  }

  return (
    <div className="grid gap-3">
      <p className="text-sm text-muted-foreground">
        {simulations.length} {simulations.length === 1 ? "estudo salvo" : "estudos salvos"}.
      </p>
      {simulations.map((simulation) => (
        <LeadMultiCotasHistoryItem
          key={simulation.id}
          onOpen={() => setSelectedSimulationId(simulation.id)}
          simulation={simulation}
        />
      ))}
      {selectedSimulation ? (
        <LeadMultiCotasReadDetail
          leadName={leadName}
          onClose={() => setSelectedSimulationId(null)}
          simulation={selectedSimulation}
        />
      ) : null}
    </div>
  );
}

function LeadMultiCotasHistoryItem({
  onOpen,
  simulation,
}: {
  onOpen: () => void;
  simulation: CrmLeadSimulation;
}) {
  const summary = resolveMultiCotasHistorySummary(simulation);

  return (
    <article className="flex flex-col gap-3 rounded-md border bg-background/70 p-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{simulation.title}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {summary.quotaCount === null ? "Quantidade de cartas nao informada" : `${summary.quotaCount} cartas`}
        </p>
        {summary.financialSummary.length ? (
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            {summary.financialSummary.join(" | ")}
          </p>
        ) : null}
      </div>
      <div className="shrink-0 text-xs text-muted-foreground sm:text-right">
        <p>Multi-Cotas</p>
        <time className="mt-1 block" dateTime={simulation.createdAt}>
          Criado em {dateFormatter.format(new Date(simulation.createdAt))}
        </time>
        <Button className="mt-3" onClick={onOpen} type="button" variant="secondary">
          Abrir
        </Button>
      </div>
    </article>
  );
}

function LeadMultiCotasReadDetail({
  leadName,
  onClose,
  simulation,
}: {
  leadName: string;
  onClose: () => void;
  simulation: CrmLeadSimulation;
}) {
  const snapshot = readRecord(simulation.calculationSnapshot);
  const input = readRecord(snapshot.input);
  const metadata = readRecord(snapshot.metadata);
  const result = readRecord(snapshot.result);
  const summary = readRecord(result.summary);
  const cards = Array.isArray(result.cards)
    ? result.cards.map(readRecord).filter((card) => Object.keys(card).length > 0)
    : [];
  const isSnapshotComplete =
    Object.keys(input).length > 0 &&
    Object.keys(summary).length > 0 &&
    cards.length > 0;

  return (
    <section className="rounded-md border bg-card p-5 text-card-foreground">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Estudo salvo
          </p>
          <h4 className="mt-1 text-base font-semibold text-foreground">
            {simulation.title}
          </h4>
          <p className="mt-1 text-xs text-muted-foreground">
            Multi-Cotas - {dateFormatter.format(new Date(simulation.createdAt))}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isSnapshotComplete ? (
            <Button
              onClick={() =>
                generateMultiCotasCommercialPdf({
                  leadName,
                  simulationCreatedAt: simulation.createdAt,
                  simulationTitle: simulation.title,
                  snapshot,
                })
              }
              type="button"
              variant="secondary"
            >
              Gerar PDF
            </Button>
          ) : null}
          <Button onClick={onClose} type="button" variant="ghost">
            Fechar detalhe
          </Button>
        </div>
      </div>

      {!isSnapshotComplete ? (
        <p className="mt-5 rounded-md border border-dashed bg-background/60 p-4 text-sm text-muted-foreground">
          Nao foi possivel carregar todos os dados deste estudo.
        </p>
      ) : (
        <div className="mt-5 grid gap-5">
          <SimulationDetailSection title="Resumo">
            <SimulationDetailGrid>
              <LeadInfo label="Cartas" value={formatIntegerOrDash(readNumber(summary.cardCount))} />
              <LeadInfo
                label="Total contratado"
                value={formatCurrencyOrDash(readNumber(summary.totalOriginalContracted))}
              />
              <LeadInfo
                label="Credito atualizado"
                value={formatCurrencyOrDash(readNumber(summary.totalUpdatedCredit))}
              />
              <LeadInfo
                label="Valor futuro"
                value={formatCurrencyOrDash(readNumber(summary.totalFutureValue))}
              />
              <LeadInfo
                label="Ganho INCC"
                value={formatCurrencyOrDash(readNumber(summary.totalInccGain))}
              />
              <LeadInfo
                label="Ganho valorizacao"
                value={formatCurrencyOrDash(readNumber(summary.totalIdleAppreciationGain))}
              />
            </SimulationDetailGrid>
          </SimulationDetailSection>

          <SimulationDetailSection title="Cartas">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {cards.map((card, index) => (
                <MultiCotasSnapshotCard
                  card={card}
                  key={readString(card.id) === "-" ? String(index) : readString(card.id)}
                />
              ))}
            </div>
          </SimulationDetailSection>

          <SimulationDetailSection title="Dados de Entrada">
            <SimulationDetailGrid>
              <LeadInfo label="Quantidade de cartas" value={formatIntegerOrDash(readNumber(input.cardCount))} />
              <LeadInfo label="Valor base" value={formatCurrencyOrDash(readNumber(input.baseCardValue))} />
              <LeadInfo label="Prazo" value={formatTermOrDash(readNumber(input.termMonths))} />
              <LeadInfo
                label="Contemplacao compartilhada"
                value={formatMonthOrDash(readNumber(input.sharedContemplationMonth))}
              />
              <LeadInfo
                label="INCC anual"
                value={formatPercentOrDash(percentValueToRate(readNumber(input.annualInccPercent)))}
              />
              <LeadInfo
                label="Valorizacao mensal"
                value={formatPercentOrDash(percentValueToRate(readNumber(input.monthlyIdleAppreciationPercent)))}
              />
              <LeadInfo
                label="Mes de consolidacao"
                value={formatMonthOrDash(readNumber(input.consolidationMonth))}
              />
              <LeadInfo label="Origem" value={readString(metadata.source)} />
            </SimulationDetailGrid>
          </SimulationDetailSection>
        </div>
      )}
    </section>
  );
}

function MultiCotasSnapshotCard({ card }: { card: Record<string, unknown> }) {
  return (
    <article className="rounded-md border bg-background/70 p-4 text-sm">
      <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
        Carta {formatIntegerOrDash(readNumber(card.position))}
      </p>
      <div className="mt-3 grid gap-2">
        <LeadInfo label="Valor original" value={formatCurrencyOrDash(readNumber(card.originalValue))} />
        <LeadInfo label="Contemplacao" value={formatMonthOrDash(readNumber(card.contemplationMonth))} />
        <LeadInfo label="Saque" value={formatMonthOrDash(readNumber(card.withdrawalMonth))} />
        <LeadInfo label="Reajustes INCC" value={formatIntegerOrDash(readNumber(card.inccAdjustmentCount))} />
        <LeadInfo label="Credito atualizado" value={formatCurrencyOrDash(readNumber(card.updatedCredit))} />
        <LeadInfo label="Valor futuro" value={formatCurrencyOrDash(readNumber(card.futureValue))} />
        <LeadInfo label="Ganho estimado" value={formatCurrencyOrDash(readNumber(card.estimatedGain))} />
        <LeadInfo label="ROI estimado" value={formatPercentOrDash(readNumber(card.estimatedGainRate))} />
      </div>
    </article>
  );
}

function LeadSimulationReadDetail({
  onClose,
  simulation,
}: {
  onClose: () => void;
  simulation: CrmLeadSimulation;
}) {
  const technicalInput = simulation.technicalInput;
  const simulatorInput = readRecord(technicalInput.simulatorInput);
  const selectedAdministrator = readRecord(technicalInput.selectedAdministrator);
  const presentationSnapshot = simulation.presentationSnapshot;
  const presentation = readRecord(presentationSnapshot.presentation);

  return (
    <section className="rounded-md border bg-card p-5 text-card-foreground">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Detalhe da simulacao
          </p>
          <h4 className="mt-1 text-base font-semibold text-foreground">
            {simulation.title}
          </h4>
          <p className="mt-1 text-xs text-muted-foreground">
            Leitura somente do snapshot salvo. Nenhum recalculo e executado.
          </p>
        </div>
        <Button onClick={onClose} type="button" variant="ghost">
          Fechar detalhe
        </Button>
      </div>

      <div className="mt-5 grid gap-5">
        <SimulationDetailSection title="Identificacao">
          <SimulationDetailGrid>
            <LeadInfo label="Titulo" value={simulation.title} />
            <LeadInfo
              label="Tipo"
              value={leadSimulationTypeLabels[simulation.simulationType]}
            />
            <LeadInfo
              label="Status"
              value={leadSimulationStatusLabels[simulation.status]}
            />
            <LeadInfo
              label="Criada em"
              value={dateFormatter.format(new Date(simulation.createdAt))}
            />
          </SimulationDetailGrid>
        </SimulationDetailSection>

        <SimulationDetailSection title="Resumo Comercial">
          <SimulationDetailGrid>
            <LeadInfo
              label="Credito"
              value={formatCurrencyOrDash(simulation.totalCredit)}
            />
            <LeadInfo
              label="Credito atualizado"
              value={formatCurrencyOrDash(simulation.updatedCredit)}
            />
            <LeadInfo
              label="Credito comercial"
              value={formatCurrencyOrDash(simulation.commercialCredit)}
            />
            <LeadInfo
              label="Parcela antes"
              value={formatCurrencyOrDash(simulation.monthlyPayment)}
            />
            <LeadInfo
              label="Parcela pos"
              value={formatCurrencyOrDash(simulation.postContemplationPayment)}
            />
            <LeadInfo
              label="Mes de contemplacao"
              value={formatMonthOrDash(simulation.contemplationMonth)}
            />
            <LeadInfo
              label="INCC"
              value={formatPercentOrDash(simulation.inccRate)}
            />
            <LeadInfo
              label="ROI estimado"
              value={formatPercentOrDash(simulation.estimatedRoi)}
            />
            <LeadInfo
              label="Lucro estimado"
              value={formatCurrencyOrDash(simulation.estimatedGain)}
            />
            <LeadInfo
              label="Venda estimada"
              value={formatCurrencyOrDash(simulation.estimatedSaleValue)}
            />
          </SimulationDetailGrid>
        </SimulationDetailSection>

        <SimulationDetailSection title="Premissas Tecnicas">
          <SimulationDetailGrid>
            <LeadInfo
              label="Administradora"
              value={readString(selectedAdministrator.name)}
            />
            <LeadInfo
              label="Cenario"
              value={formatScenarioKey(readString(technicalInput.selectedScenarioKey))}
            />
            <LeadInfo
              label="Seguro"
              value={formatInsuranceOption(readString(technicalInput.insuranceOption))}
            />
            <LeadInfo
              label="Tipo de lance"
              value={formatBidType(readString(technicalInput.bidType))}
            />
            <LeadInfo
              label="Taxa administrativa"
              value={formatPercentOrDash(readNumber(simulatorInput.administrativeFeeRate))}
            />
            <LeadInfo
              label="Fundo de reserva"
              value={formatPercentOrDash(readNumber(simulatorInput.reserveFundRate))}
            />
            <LeadInfo
              label="Prazo"
              value={formatTermOrDash(readNumber(simulatorInput.termMonths))}
            />
            <LeadInfo
              label="INCC"
              value={formatPercentOrDash(readNumber(simulatorInput.inccRate))}
            />
            <LeadInfo
              label="Venda da carta"
              value={formatPercentOrDash(readNumber(simulatorInput.cardSaleRate))}
            />
            <LeadInfo
              label="Lance embutido"
              value={formatPercentOrDash(readNumber(simulatorInput.embeddedBidRate))}
            />
            <LeadInfo
              label="Lance em dinheiro"
              value={formatPercentOrDash(readNumber(simulatorInput.cashBidRate))}
            />
          </SimulationDetailGrid>
        </SimulationDetailSection>

        <SimulationDetailSection title="Apresentacao">
          <SimulationDetailGrid>
            <LeadInfo
              label="Cenario selecionado"
              value={readString(presentation.selectedScenarioName)}
            />
            <LeadInfo
              label="Seguro"
              value={readString(presentation.insuranceLabel)}
            />
            <LeadInfo
              label="Tipo de lance"
              value={readString(presentation.bidLabel)}
            />
            <LeadInfo
              label="Investimento real"
              value={formatCurrencyOrDash(readNumber(presentation.realInvestment))}
            />
            <LeadInfo
              label="Credito liquido"
              value={formatCurrencyOrDash(readNumber(presentation.liquidCredit))}
            />
            <LeadInfo
              label="Credito comercial"
              value={formatCurrencyOrDash(readNumber(presentation.commercialCredit))}
            />
            <LeadInfo
              label="Lucro estimado"
              value={formatCurrencyOrDash(readNumber(presentation.estimatedCardSaleProfit))}
            />
            <LeadInfo
              label="Alavancagem"
              value={formatMultipleOrDash(readNumber(presentation.leverageMultiple))}
            />
          </SimulationDetailGrid>
        </SimulationDetailSection>
      </div>
    </section>
  );
}

function SimulationDetailSection({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <div>
      <h5 className="text-sm font-semibold text-foreground">{title}</h5>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function SimulationDetailGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{children}</div>;
}

const timelineEventToneClassNames: Record<
  CrmOperationalTimelineEvent["type"],
  string
> = {
  commercial_simulation_created: "border-l-4 border-l-violet-200",
  multi_cotas_created: "border-l-4 border-l-teal-200",
  note_created: "border-l-4 border-l-sky-200",
  task_cancelled: "border-l-4 border-l-stone-300",
  task_completed: "border-l-4 border-l-emerald-200",
  task_created: "border-l-4 border-l-amber-200",
};

const timelineEventTypeLabels: Record<
  CrmOperationalTimelineEvent["type"],
  string
> = {
  commercial_simulation_created: "Simulacao Comercial criada",
  multi_cotas_created: "Estudo Multi-Cotas criado",
  note_created: "Nota adicionada",
  task_cancelled: "Tarefa cancelada",
  task_completed: "Tarefa concluida",
  task_created: "Tarefa criada",
};

const leadSimulationTypeLabels: Record<
  CrmLeadSimulation["simulationType"],
  string
> = {
  commercial: "Comercial",
  multi_cotas: "Multi-Cotas",
};

const leadSimulationStatusLabels: Record<
  CrmLeadSimulation["status"],
  string
> = {
  archived: "Arquivada",
  draft: "Rascunho",
  pdf_generated: "PDF gerado",
  pdf_sent: "PDF enviado",
  presented: "Apresentada",
  proposal_generated: "Proposta gerada",
};

const simulationScenarioLabels: Record<string, string> = {
  full: "Parcela cheia",
  half: "50%",
  seventy: "70%",
};

const simulationInsuranceLabels: Record<string, string> = {
  "with-insurance": "Com seguro",
  "without-insurance": "Sem seguro",
};

const simulationBidLabels: Record<string, string> = {
  cash: "Lance em dinheiro",
  embedded: "Lance embutido",
  none: "Sem lance",
};

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function resolveMultiCotasHistorySummary(simulation: CrmLeadSimulation) {
  const calculationSnapshot = readRecord(simulation.calculationSnapshot);
  const result = readRecord(calculationSnapshot.result);
  const snapshotSummary = readRecord(result.summary);
  const quotaCount =
    readNumber(snapshotSummary.cardCount) ?? simulation.quotaCount ?? null;
  const totalUpdatedCredit =
    readNumber(snapshotSummary.totalUpdatedCredit) ?? simulation.updatedCredit;
  const totalFutureValue =
    readNumber(snapshotSummary.totalFutureValue) ?? simulation.estimatedSaleValue;
  const estimatedGain =
    readNumber(snapshotSummary.totalInccGain) !== null &&
    readNumber(snapshotSummary.totalIdleAppreciationGain) !== null
      ? (readNumber(snapshotSummary.totalInccGain) ?? 0) +
        (readNumber(snapshotSummary.totalIdleAppreciationGain) ?? 0)
      : simulation.estimatedGain;
  const financialSummary = [
    totalUpdatedCredit === null
      ? null
      : `Credito atualizado: ${currencyFormatter.format(totalUpdatedCredit)}`,
    totalFutureValue === null
      ? null
      : `Valor futuro: ${currencyFormatter.format(totalFutureValue)}`,
    estimatedGain === null
      ? null
      : `Ganho estimado: ${currencyFormatter.format(estimatedGain)}`,
  ].filter((value): value is string => Boolean(value));

  return {
    financialSummary,
    quotaCount,
  };
}

function sortLeadSimulationsByCreatedAtDesc(
  first: CrmLeadSimulation,
  second: CrmLeadSimulation,
) {
  return (
    new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime()
  );
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : "-";
}

function formatCurrencyOrDash(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value)
    ? currencyFormatter.format(value)
    : "-";
}

function formatPercentOrDash(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value)
    ? percentFormatter.format(value)
    : "-";
}

function percentValueToRate(value: number | null) {
  return value === null ? null : value / 100;
}

function formatIntegerOrDash(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value)
    ? String(Math.trunc(value))
    : "-";
}

function formatMonthOrDash(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value)
    ? `Mes ${value}`
    : "-";
}

function formatTermOrDash(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value)
    ? `${value} meses`
    : "-";
}

function formatMultipleOrDash(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value)
    ? `${value.toLocaleString("pt-BR", {
        maximumFractionDigits: 2,
        minimumFractionDigits: 2,
      })}x`
    : "-";
}

function formatScenarioKey(value: string) {
  return simulationScenarioLabels[value] ?? value;
}

function formatInsuranceOption(value: string) {
  return simulationInsuranceLabels[value] ?? value;
}

function formatBidType(value: string) {
  return simulationBidLabels[value] ?? value;
}

function ExecutiveDossierCard({
  children,
  description,
  eyebrow,
  title,
}: {
  children: React.ReactNode;
  description: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <article className="executive-surface min-w-0 rounded-md p-5 text-card-foreground">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {eyebrow}
      </p>
      <SectionHeader description={description} title={title} />
      <div className="mt-4">{children}</div>
    </article>
  );
}

function GeneratedProposalItem({
  proposal,
}: {
  proposal: GeneratedProposalRecord;
}) {
  return (
    <div className="rounded-md border bg-card p-3 text-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium text-foreground">
            {proposal.recommendedScenario}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {dateFormatter.format(new Date(proposal.generatedAt))}
          </p>
        </div>
        <span className="text-xs font-medium text-muted-foreground">
          {percentFormatter.format(proposal.roiPercent)}
        </span>
      </div>
      <div className="mt-3 grid gap-2">
        <LeadInfo
          label="Credito"
          value={currencyFormatter.format(proposal.commercialCredit)}
        />
        <LeadInfo label="Arquivo" value={proposal.fileName || "-"} />
      </div>
    </div>
  );
}

function SectionHeader({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

function LeadInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-background/70 p-3">
      <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 break-words text-sm text-foreground">{value}</p>
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
      {label}
      {children}
    </label>
  );
}

function CommercialSignalBadge({
  children,
  signal,
  summary,
}: {
  children: React.ReactNode;
  signal: CrmCommercialSignal;
  summary: string;
}) {
  return (
    <span
      className={cn(
        "rounded-full border px-2 py-1 text-muted-foreground",
        getCommercialSignalClassName(signal),
      )}
      title={summary}
    >
      {children}
    </span>
  );
}

function OperationalPriorityBadge({
  children,
  priority,
  summary,
}: {
  children: React.ReactNode;
  priority: CrmOperationalPriority;
  summary: string;
}) {
  return (
    <span
      className={cn(
        "rounded-full border px-2 py-1 text-muted-foreground",
        getOperationalPriorityClassName(priority),
      )}
      title={summary}
    >
      {children}
    </span>
  );
}

function getCommercialSignalClassName(signal: CrmCommercialSignal) {
  if (signal === "hot") {
    return "border-[#d9a184] bg-[#f5e8df] text-[#9a4f32]";
  }

  if (signal === "warm") {
    return "border-[#d9c28a] bg-[#f7f0df] text-[#80662f]";
  }

  if (signal === "cold") {
    return "border-[#c8d4dc] bg-[#edf3f6] text-[#546977]";
  }

  if (signal === "abandoned") {
    return "border-[#d2b2b2] bg-[#f6eeee] text-[#8a4b4b]";
  }

  return "border-border bg-background text-muted-foreground";
}

function getOperationalPriorityClassName(priority: CrmOperationalPriority) {
  if (priority === "overdue") {
    return "border-[#d9a184] bg-[#f5e8df] text-[#9a4f32]";
  }

  if (priority === "today") {
    return "border-[#d9c28a] bg-[#f7f0df] text-[#80662f]";
  }

  if (
    priority === "missing_action" ||
    priority === "missing_date" ||
    priority === "missing_description"
  ) {
    return "border-[#d2b2b2] bg-[#f6eeee] text-[#8a4b4b]";
  }

  if (priority === "soon") {
    return "border-[#b7c8bd] bg-[#edf5ef] text-[#3f6d4e]";
  }

  return "border-border bg-background text-muted-foreground";
}
