"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Plus,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LeadContractsCard } from "@/components/crm/lead-contracts-card";
import { PrimaryJourneyAction } from "@/components/crm/primary-journey-action";
import { CrmStructuredNotesList } from "@/components/crm/crm-structured-notes";
import { PublicationBuilderPanel } from "@/components/patrimonial-strategy/publication-builder-panel";
import type { ConvertLeadToClientInput } from "@/modules/client-context";
import {
  buildDualPipelineSnapshot,
  buildRevenueRecognitionSnapshot,
} from "@/modules/crm-domain";
import type { CommercialAttentionProductDecision } from "@/modules/decision-models/dm001-product-surface";
import {
  fetchLeadCommercialProposals,
} from "@/modules/crm/client/crm-lead-commercial-proposals-client";
import {
  archiveCrmLeadKnowledgeItem,
  createCrmLeadKnowledgeItem,
  fetchCrmLeadKnowledgeItems,
} from "@/modules/crm/client/crm-lead-knowledge-client";
import {
  archiveKnowledgeEvidence,
  createKnowledgeEvidence,
  fetchKnowledgeEvidence,
} from "@/modules/crm/client/knowledge-evidence-client";
import {
  createCrmLeadProfile,
  fetchCrmLeadProfile,
  updateCrmLeadProfile,
} from "@/modules/crm/client/crm-lead-profiles-client";
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
  buildTemporaryStructuredNotesFromLead,
  getDefaultStageForPipeline,
  getStagesForPipeline,
  isStageInPipeline,
  resolveCrmLeadCommercialSignal,
  resolveCrmLeadGreenFlags,
  resolveCrmLeadOperationalPriority,
  resolveCrmTaskTemporalStatus,
  resolveNextPendingCrmTask,
  type CrmCommercialSignal,
  type CrmLeadKnowledgeConfidence,
  type CrmLeadKnowledgeItem,
  type CrmLeadKnowledgeType,
  type KnowledgeEvidence,
  type KnowledgeEvidenceType,
  type CrmLeadGreenFlag,
  type CrmLead,
  type CrmLeadInput,
  type CrmLeadNote,
  type CrmLeadProfile,
  type CrmLeadProfileCurrentMoment,
  type CrmLeadProfilePrimaryGoal,
  type CrmLeadProfileStrategicTopic,
  type CrmLeadCommercialProposal,
  type CrmLeadSimulation,
  type CrmOperationalPriority,
  type CrmTask,
  type CrmTaskType,
  type CrmOperationalTimelineEvent,
  type CrmTimelineReadModel,
  type CrmPipeline,
  type CrmStage,
  type CrmStructuredNote,
  crmLeadProfileCurrentMoments,
  crmLeadProfilePrimaryGoals,
  crmLeadProfileStrategicTopics,
  buildExecutiveBriefing,
  buildFrictionMap,
} from "@/modules/crm";
import type { GeneratedProposalRecord } from "@/modules/proposal/proposal-history";
import { fetchLeadContracts } from "@/modules/contracts/client";
import type { LeadContractSummary } from "@/modules/contracts/types";
import { generateMultiCotasCommercialPdf } from "@/modules/reports";
import {
  centsToCurrencyAmount,
  isReferenceCapitalStrategySnapshot,
  readPublicationsFromStrategySnapshot,
  type PatrimonialPublication,
  type ReferenceCapitalStrategySnapshot,
} from "@/modules/patrimonial-strategy";
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

type StrategicProfileDraft = {
  currentMoment: CrmLeadProfileCurrentMoment | "";
  primaryGoal: CrmLeadProfilePrimaryGoal | "";
  strategicNotes: string;
  strategicTopics: CrmLeadProfileStrategicTopic[];
};

type KnowledgeDraft = {
  confidence: CrmLeadKnowledgeConfidence;
  knowledgeType: CrmLeadKnowledgeType;
  summary: string;
  title: string;
};

type EvidenceDraft = {
  evidenceType: KnowledgeEvidenceType;
  source: string;
  sourceReference: string;
  summary: string;
  title: string;
};

type DossierTabKey =
  | "summary"
  | "timeline"
  | "simulations"
  | "tasks-notes"
  | "communications"
  | "meetings"
  | "calls";

function canLeadConvertToClientByBusinessState(lead: CrmLead) {
  const pipelineSnapshot = buildDualPipelineSnapshot(lead);
  const revenueSnapshot = buildRevenueRecognitionSnapshot(lead);

  return (
    lead.status === "ganha" ||
    revenueSnapshot.status === "recognized" ||
    Boolean(revenueSnapshot.salesClosedAt) ||
    pipelineSnapshot.stageDomain === "venda_concluida" ||
    pipelineSnapshot.stageDomain === "primeiro_boleto_pago" ||
    pipelineSnapshot.stageDomain === "aprovacao_administradora"
  );
}

type CrmLeadDetailProps = {
  draft: CrmLeadInput;
  feedbackMessage?: string | null;
  lead: CrmLead;
  onCancel: () => void;
  onClearFeedbackMessage?: () => void;
  onConvertToClient?: (input: ConvertLeadToClientInput) => void | Promise<void>;
  onDraftChange: (draft: CrmLeadInput) => void;
  onGenerateMultiCotas?: (lead: CrmLead) => void;
  onGenerateReferenceCapitalStrategy?: (lead: CrmLead) => void;
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
  onConvertToClient,
  onDraftChange,
  onGenerateMultiCotas,
  onGenerateReferenceCapitalStrategy,
  onGenerateSimulation,
  onSave,
  proposals,
}: CrmLeadDetailProps) {
  const [isNotesHistoryOpen, setIsNotesHistoryOpen] = useState(false);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isKnowledgeFormOpen, setIsKnowledgeFormOpen] = useState(false);
  const [activeDossierTab, setActiveDossierTab] =
    useState<DossierTabKey>("summary");
  const [isCommercialDataOpen, setIsCommercialDataOpen] = useState(false);
  const [isStrategicProfileFormOpen, setIsStrategicProfileFormOpen] =
    useState(false);
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [isCompletingTask, setIsCompletingTask] = useState(false);
  const [isCancelingTask, setIsCancelingTask] = useState(false);
  const [isLoadingStrategicProfile, setIsLoadingStrategicProfile] =
    useState(false);
  const [isSavingStrategicProfile, setIsSavingStrategicProfile] =
    useState(false);
  const [isCreatingKnowledge, setIsCreatingKnowledge] = useState(false);
  const [archivingKnowledgeId, setArchivingKnowledgeId] = useState<string | null>(
    null,
  );
  const [noteContent, setNoteContent] = useState("");
  const [taskDraft, setTaskDraft] = useState<TaskDraft>(() =>
    createDefaultTaskDraft(),
  );
  const [knowledgeDraft, setKnowledgeDraft] = useState<KnowledgeDraft>(() =>
    createDefaultKnowledgeDraft(),
  );
  const [strategicProfileDraft, setStrategicProfileDraft] =
    useState<StrategicProfileDraft>(createEmptyStrategicProfileDraft);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [taskError, setTaskError] = useState<string | null>(null);
  const [knowledgeError, setKnowledgeError] = useState<string | null>(null);
  const [strategicProfileError, setStrategicProfileError] = useState<string | null>(
    null,
  );
  const [noteSuccessMessage, setNoteSuccessMessage] = useState<string | null>(null);
  const [taskSuccessMessage, setTaskSuccessMessage] = useState<string | null>(null);
  const [knowledgeSuccessMessage, setKnowledgeSuccessMessage] = useState<
    string | null
  >(null);
  const [strategicProfileSuccessMessage, setStrategicProfileSuccessMessage] =
    useState<string | null>(null);
  const [notesState, setNotesState] = useState<{
    leadId: string;
    notes: CrmLeadNote[];
  } | null>(null);
  const [tasksState, setTasksState] = useState<{
    leadId: string;
    tasks: CrmTask[];
  } | null>(null);
  const [knowledgeState, setKnowledgeState] = useState<{
    items: CrmLeadKnowledgeItem[];
    leadId: string;
  } | null>(null);
  const [simulationsState, setSimulationsState] = useState<{
    leadId: string;
    simulations: CrmLeadSimulation[];
  } | null>(null);
  const [commercialProposalsState, setCommercialProposalsState] = useState<{
    leadId: string;
    proposals: CrmLeadCommercialProposal[];
  } | null>(null);
  const [contractsState, setContractsState] = useState<{
    contracts: LeadContractSummary[];
    leadId: string;
  } | null>(null);
  const [strategicProfileState, setStrategicProfileState] = useState<{
    leadId: string;
    profile: CrmLeadProfile | null;
  } | null>(null);
  const [timelineState, setTimelineState] = useState<{
    leadId: string;
    timeline: CrmTimelineReadModel;
  } | null>(null);
  const [commercialAttentionState, setCommercialAttentionState] = useState<{
    decision: CommercialAttentionProductDecision | null;
    leadId: string;
  } | null>(null);
  const [leadMetaDeclarationsState, setLeadMetaDeclarationsState] = useState<{
    declaredBrazilianAndCpfStatus: "yes" | "no" | null;
    leadId: string;
    monthlyInvestmentCapacity: string | null;
  } | null>(null);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [isLoadingKnowledge, setIsLoadingKnowledge] = useState(false);
  const [isLoadingSimulations, setIsLoadingSimulations] = useState(false);
  const [isLoadingCommercialProposals, setIsLoadingCommercialProposals] =
    useState(false);
  const [isLoadingContracts, setIsLoadingContracts] = useState(false);
  const [isLoadingTimeline, setIsLoadingTimeline] = useState(false);
  const [isLoadingCommercialAttention, setIsLoadingCommercialAttention] =
    useState(false);
  const [taskLoadError, setTaskLoadError] = useState<string | null>(null);
  const [knowledgeLoadError, setKnowledgeLoadError] = useState<string | null>(
    null,
  );
  const [taskActionError, setTaskActionError] = useState<string | null>(null);
  const [simulationsError, setSimulationsError] = useState<string | null>(null);
  const [commercialProposalsError, setCommercialProposalsError] = useState<
    string | null
  >(null);
  const [contractsError, setContractsError] = useState<string | null>(null);
  const [timelineError, setTimelineError] = useState<string | null>(null);
  const [commercialAttentionError, setCommercialAttentionError] = useState<
    string | null
  >(null);
  const leadDisplayName = useMemo(() => getLeadDisplayName(lead), [lead]);
  const structuredNotes = buildTemporaryStructuredNotesFromLead(lead);
  const persistedNotes =
    notesState?.leadId === lead.id ? notesState.notes : [];
  const knowledgeItems =
    knowledgeState?.leadId === lead.id ? knowledgeState.items : [];
  const strategicProfile =
    strategicProfileState?.leadId === lead.id ? strategicProfileState.profile : null;
  const nextPendingTask = useMemo(
    () =>
      resolveNextPendingCrmTask(
        tasksState?.leadId === lead.id ? tasksState.tasks : [],
      ),
    [lead.id, tasksState],
  );
  const persistedStructuredNotes = persistedNotes.map(mapLeadNoteToStructuredNote);
  const latestPersistedNote = persistedStructuredNotes[0] ?? null;
  const historicalPersistedNotes = persistedStructuredNotes.slice(1);
  const timelineEvents = useMemo(
    () =>
      timelineState?.leadId === lead.id ? timelineState.timeline.events : [],
    [lead.id, timelineState],
  );
  const commercialAttentionDecision =
    commercialAttentionState?.leadId === lead.id
      ? commercialAttentionState.decision
      : null;
  const leadSimulations = useMemo(
    () =>
      simulationsState?.leadId === lead.id
        ? simulationsState.simulations
        : [],
    [lead.id, simulationsState],
  );
  const commercialProposals = useMemo(
    () =>
      commercialProposalsState?.leadId === lead.id
        ? commercialProposalsState.proposals
        : [],
    [commercialProposalsState, lead.id],
  );
  const leadContracts =
    contractsState?.leadId === lead.id ? contractsState.contracts : [];
  const commercialSimulations = leadSimulations.filter(
    (simulation) => simulation.simulationType === "commercial",
  );
  const multiCotasSimulations = leadSimulations
    .filter((simulation) => simulation.simulationType === "multi_cotas")
    .sort(sortLeadSimulationsByCreatedAtDesc);
  const latestCommercialSimulation = useMemo(
    () =>
      [...commercialSimulations].sort(sortLeadSimulationsByCreatedAtDesc)[0] ??
      null,
    [commercialSimulations],
  );
  const latestMultiCotasSimulation = multiCotasSimulations[0] ?? null;
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
  const executiveBriefingItems = buildExecutiveBriefing({
    greenFlags,
    knowledgeItems,
    latestCommercialSimulation,
    latestMovement,
    latestMultiCotasSimulation,
    lead,
    leadSimulations,
    nextPendingTask,
    strategicProfile,
    timelineEvents,
  });
  const frictionMapItems = buildFrictionMap({
    knowledgeItems,
    leadSimulations,
    latestMovement,
    nextPendingTask,
  });
  const knowledgeGapItems = buildKnowledgeGaps({
    commercialSimulations,
    knowledgeItems,
    lead,
    multiCotasSimulations,
    strategicProfile,
  });
  const monthlyInvestmentCapacity =
    leadMetaDeclarationsState?.leadId === lead.id
      ? leadMetaDeclarationsState.monthlyInvestmentCapacity
      : null;
  const declaredBrazilianAndCpfStatus =
    leadMetaDeclarationsState?.leadId === lead.id
      ? leadMetaDeclarationsState.declaredBrazilianAndCpfStatus
      : null;
  const declaredBrazilianAndCpfLabel =
    declaredBrazilianAndCpfStatus === "yes"
      ? "Sim"
      : declaredBrazilianAndCpfStatus === "no"
        ? "Não"
        : null;
  const canLeadConvertByBusinessState =
    canLeadConvertToClientByBusinessState(lead);
  const canConvertToClient =
    canLeadConvertByBusinessState &&
    !isLoadingStrategicProfile &&
    !isLoadingSimulations &&
    Boolean(onConvertToClient);
  useEffect(() => {
    let isActive = true;

    async function loadMonthlyInvestmentCapacity() {
      setLeadMetaDeclarationsState({
        declaredBrazilianAndCpfStatus: null,
        leadId: lead.id,
        monthlyInvestmentCapacity: null,
      });

      if (lead.sourceSystem !== "meta_lead_ads") {
        return;
      }

      const accessToken = await readSupabaseAccessToken();

      if (!accessToken) {
        return;
      }

      const response = await fetch(
        `/api/crm/lead-monthly-investment-capacity?leadId=${encodeURIComponent(lead.id)}`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      ).catch(() => null);
      const payload = response?.ok
        ? await response.json().catch(() => null) as {
            declaredBrazilianAndCpfStatus?: unknown;
            monthlyInvestmentCapacity?: unknown;
          } | null
        : null;

      if (isActive) {
        setLeadMetaDeclarationsState({
          declaredBrazilianAndCpfStatus:
            payload?.declaredBrazilianAndCpfStatus === "yes" ||
            payload?.declaredBrazilianAndCpfStatus === "no"
              ? payload.declaredBrazilianAndCpfStatus
              : null,
          leadId: lead.id,
          monthlyInvestmentCapacity:
            typeof payload?.monthlyInvestmentCapacity === "string"
              ? payload.monthlyInvestmentCapacity
              : null,
        });
      }
    }

    void loadMonthlyInvestmentCapacity();

    return () => {
      isActive = false;
    };
  }, [lead.id, lead.sourceSystem]);

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

    async function loadKnowledgeItems() {
      setIsLoadingKnowledge(true);
      setKnowledgeLoadError(null);
      setKnowledgeError(null);

      const accessToken = await readSupabaseAccessToken();

      if (!accessToken) {
        if (isActive) {
          setIsLoadingKnowledge(false);
          setKnowledgeLoadError(
            "Nao foi possivel carregar a memoria organizacional.",
          );
        }
        return;
      }

      try {
        const items = await fetchCrmLeadKnowledgeItems(accessToken, lead.id);

        if (isActive) {
          setKnowledgeState({
            items,
            leadId: lead.id,
          });
        }
      } catch {
        if (isActive) {
          setKnowledgeLoadError(
            "Nao foi possivel carregar a memoria organizacional.",
          );
        }
      } finally {
        if (isActive) {
          setIsLoadingKnowledge(false);
        }
      }
    }

    void loadKnowledgeItems();

    return () => {
      isActive = false;
    };
  }, [lead.id]);

  useEffect(() => {
    let isActive = true;

    async function loadCommercialProposals() {
      setIsLoadingCommercialProposals(true);
      setCommercialProposalsError(null);

      const accessToken = await readSupabaseAccessToken();

      if (!accessToken) {
        if (isActive) {
          setIsLoadingCommercialProposals(false);
          setCommercialProposalsError(
            "Nao foi possivel carregar as propostas comerciais.",
          );
        }
        return;
      }

      try {
        const proposals = await fetchLeadCommercialProposals(
          accessToken,
          lead.id,
        );

        if (isActive) {
          setCommercialProposalsState({
            leadId: lead.id,
            proposals,
          });
        }
      } catch {
        if (isActive) {
          setCommercialProposalsError(
            "Nao foi possivel carregar as propostas comerciais.",
          );
        }
      } finally {
        if (isActive) {
          setIsLoadingCommercialProposals(false);
        }
      }
    }

    void loadCommercialProposals();

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

    async function loadContracts() {
      setIsLoadingContracts(true);
      setContractsError(null);

      const accessToken = await readSupabaseAccessToken();

      if (!accessToken) {
        if (isActive) {
          setIsLoadingContracts(false);
          setContractsError("Nao foi possivel carregar os contratos.");
        }
        return;
      }

      try {
        const contracts = await fetchLeadContracts(accessToken, lead.id);

        if (isActive) {
          setContractsState({
            contracts,
            leadId: lead.id,
          });
        }
      } catch {
        if (isActive) {
          setContractsError("Nao foi possivel carregar os contratos.");
        }
      } finally {
        if (isActive) {
          setIsLoadingContracts(false);
        }
      }
    }

    void loadContracts();

    return () => {
      isActive = false;
    };
  }, [lead.id]);

  useEffect(() => {
    let isActive = true;

    async function loadStrategicProfile() {
      setIsLoadingStrategicProfile(true);
      setStrategicProfileError(null);

      const accessToken = await readSupabaseAccessToken();

      if (!accessToken) {
        if (isActive) {
          setIsLoadingStrategicProfile(false);
          setStrategicProfileError(
            "Nao foi possivel carregar o perfil estrategico.",
          );
        }
        return;
      }

      try {
        const profile = await fetchCrmLeadProfile(accessToken, lead.id);

        if (isActive) {
          setStrategicProfileState({
            leadId: lead.id,
            profile,
          });
          setStrategicProfileDraft(
            profile
              ? mapStrategicProfileToDraft(profile)
              : createEmptyStrategicProfileDraft(),
          );
          setIsStrategicProfileFormOpen(false);
        }
      } catch {
        if (isActive) {
          setStrategicProfileError(
            "Nao foi possivel carregar o perfil estrategico.",
          );
        }
      } finally {
        if (isActive) {
          setIsLoadingStrategicProfile(false);
        }
      }
    }

    void loadStrategicProfile();

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

    async function loadCommercialAttention() {
      setIsLoadingCommercialAttention(true);
      setCommercialAttentionError(null);

      const accessToken = await readSupabaseAccessToken();

      if (!accessToken) {
        if (isActive) {
          setIsLoadingCommercialAttention(false);
          setCommercialAttentionError(
            "Nao foi possivel carregar a atencao comercial.",
          );
        }
        return;
      }

      try {
        const decision = await fetchLeadCommercialAttention(
          accessToken,
          lead.id,
        );

        if (isActive) {
          setCommercialAttentionState({
            decision,
            leadId: lead.id,
          });
        }
      } catch {
        if (isActive) {
          setCommercialAttentionError(
            "Nao foi possivel carregar a atencao comercial.",
          );
        }
      } finally {
        if (isActive) {
          setIsLoadingCommercialAttention(false);
        }
      }
    }

    void loadCommercialAttention();

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
    if (!knowledgeSuccessMessage) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setKnowledgeSuccessMessage(null);
    }, 3000);

    return () => window.clearTimeout(timeoutId);
  }, [knowledgeSuccessMessage]);

  useEffect(() => {
    if (!strategicProfileSuccessMessage) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setStrategicProfileSuccessMessage(null);
    }, 3000);

    return () => window.clearTimeout(timeoutId);
  }, [strategicProfileSuccessMessage]);

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

  async function handleConvertToClient() {
    if (!onConvertToClient || !canLeadConvertByBusinessState) {
      return;
    }

    await onConvertToClient({
      convertedBy: {
        name: "EVOLV",
        userId: null,
      },
      latestCommercialSimulation,
      latestMultiCotasStudy: latestMultiCotasSimulation,
      lead: {
        email: lead.email,
        id: lead.id,
        nome: lead.nome,
        telefone: lead.telefone,
      },
      strategicProfile,
    });
  }

  function handleGenerateLeadSimulation() {
    onGenerateSimulation?.(lead);
  }

  function handleGenerateLeadMultiCotas() {
    onGenerateMultiCotas?.(lead);
  }

  function handleGenerateLeadReferenceCapitalStrategy() {
    onGenerateReferenceCapitalStrategy?.(lead);
  }

  function updateStrategicProfileDraft(
    patch: Partial<StrategicProfileDraft>,
  ) {
    setStrategicProfileDraft((current) => ({
      ...current,
      ...patch,
    }));
  }

  function handlePipelineChange(pipeline: CrmPipeline) {
    updateDraft({
      pipeline,
      etapa: isStageInPipeline(pipeline, draft.etapa)
        ? draft.etapa
        : getDefaultStageForPipeline(pipeline),
    });
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

  function updateKnowledgeDraft(patch: Partial<KnowledgeDraft>) {
    setKnowledgeDraft((current) => ({
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
      setIsNotesHistoryOpen(false);
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

  async function handleSaveStrategicProfile() {
    setIsSavingStrategicProfile(true);
    setStrategicProfileError(null);
    setStrategicProfileSuccessMessage(null);

    try {
      const accessToken = await readSupabaseAccessToken();

      if (!accessToken) {
        throw new Error("Sessao invalida.");
      }

      const payload = {
        currentMoment: strategicProfileDraft.currentMoment || null,
        leadId: lead.id,
        primaryGoal: strategicProfileDraft.primaryGoal || null,
        strategicNotes: strategicProfileDraft.strategicNotes || null,
        strategicTopics: strategicProfileDraft.strategicTopics,
      };

      const profile = strategicProfile
        ? await updateCrmLeadProfile(accessToken, payload)
        : await createCrmLeadProfile(accessToken, payload);

      setStrategicProfileState({
        leadId: lead.id,
        profile,
      });
      setStrategicProfileDraft(mapStrategicProfileToDraft(profile));
      setIsStrategicProfileFormOpen(false);
      setStrategicProfileSuccessMessage(
        strategicProfile
          ? "Perfil estrategico atualizado com sucesso."
          : "Perfil estrategico criado com sucesso.",
      );
    } catch (error) {
      setStrategicProfileError(
        error instanceof Error
          ? error.message
          : "Nao foi possivel salvar o perfil estrategico.",
      );
    } finally {
      setIsSavingStrategicProfile(false);
    }
  }

  async function handleCreateKnowledgeItem() {
    const title = knowledgeDraft.title.trim();

    if (!title) {
      setKnowledgeError("Titulo e obrigatorio.");
      return;
    }

    setIsCreatingKnowledge(true);
    setKnowledgeError(null);
    setKnowledgeSuccessMessage(null);

    try {
      const accessToken = await readSupabaseAccessToken();

      if (!accessToken) {
        throw new Error("Sessao invalida.");
      }

      const item = await createCrmLeadKnowledgeItem(accessToken, {
        confidence: knowledgeDraft.confidence,
        knowledgeCategory: "DECLARED",
        knowledgeType: knowledgeDraft.knowledgeType,
        leadId: lead.id,
        summary: knowledgeDraft.summary || undefined,
        title,
      });

      setKnowledgeState((current) => ({
        items:
          current?.leadId === lead.id
            ? [item, ...current.items.filter((entry) => entry.id !== item.id)]
            : [item],
        leadId: lead.id,
      }));
      setKnowledgeDraft(createDefaultKnowledgeDraft());
      setIsKnowledgeFormOpen(false);
      setKnowledgeSuccessMessage("Conhecimento registrado.");
    } catch (error) {
      setKnowledgeError(
        error instanceof Error
          ? error.message
          : "Nao foi possivel criar o conhecimento.",
      );
    } finally {
      setIsCreatingKnowledge(false);
    }
  }

  async function handleArchiveKnowledgeItem(item: CrmLeadKnowledgeItem) {
    if (archivingKnowledgeId) {
      return;
    }

    setArchivingKnowledgeId(item.id);
    setKnowledgeError(null);
    setKnowledgeSuccessMessage(null);

    try {
      const accessToken = await readSupabaseAccessToken();

      if (!accessToken) {
        throw new Error("Sessao invalida.");
      }

      await archiveCrmLeadKnowledgeItem(accessToken, item.id);

      setKnowledgeState((current) => ({
        items:
          current?.leadId === lead.id
            ? current.items.filter((entry) => entry.id !== item.id)
            : [],
        leadId: lead.id,
      }));
      setKnowledgeSuccessMessage("Conhecimento arquivado.");
    } catch (error) {
      setKnowledgeError(
        error instanceof Error
          ? error.message
          : "Nao foi possivel arquivar o conhecimento.",
      );
    } finally {
      setArchivingKnowledgeId(null);
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
      {onGenerateSimulation || onGenerateMultiCotas || onGenerateReferenceCapitalStrategy ? (
        <PrimaryJourneyAction
          onSelectCommercialSimulation={handleGenerateLeadSimulation}
          onSelectMultiCotas={handleGenerateLeadMultiCotas}
          onSelectReferenceCapitalStrategy={handleGenerateLeadReferenceCapitalStrategy}
        />
      ) : null}

      <section className="executive-surface rounded-md p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Dossie multicanal
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

          <div className="flex flex-wrap justify-end gap-3">
            {canLeadConvertByBusinessState ? (
              <Button
                disabled={!canConvertToClient}
                onClick={handleConvertToClient}
                type="button"
              >
                <Plus className="h-4 w-4" aria-hidden />
                {isLoadingStrategicProfile || isLoadingSimulations
                  ? "Preparando conversao..."
                  : "Converter para Cliente"}
              </Button>
            ) : null}
            <Button onClick={onCancel} type="button" variant="ghost">
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Voltar ao pipeline
            </Button>
          </div>
        </div>
      </section>

      <section className="executive-surface rounded-md p-3 sm:p-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <DossierMultichannelNavigation
            activeTab={activeDossierTab}
            className="min-w-0 flex-1"
            onChange={setActiveDossierTab}
          />
          <div className="grid gap-3 sm:grid-cols-[minmax(0,12rem)_minmax(0,14rem)_auto] xl:min-w-[34rem]">
            <Field label="Funil">
              <select
                className={fieldInputClass}
                form="lead-detail-form"
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
            <Field label="Etapa">
              <select
                className={fieldInputClass}
                form="lead-detail-form"
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
            <div className="flex items-end">
              <Button form="lead-detail-form" type="submit">
                <Plus className="h-4 w-4" aria-hidden />
                Salvar lead
              </Button>
            </div>
          </div>
        </div>
      </section>

      <form className="grid gap-4" id="lead-detail-form" onSubmit={onSave}>
        {feedbackMessage ? (
          <SuccessFeedback message={feedbackMessage} />
        ) : null}

        {noteSuccessMessage ? (
          <SuccessFeedback message={noteSuccessMessage} />
        ) : null}

        {taskSuccessMessage ? (
          <SuccessFeedback message={taskSuccessMessage} />
        ) : null}

        {knowledgeSuccessMessage ? (
          <SuccessFeedback message={knowledgeSuccessMessage} />
        ) : null}

        {strategicProfileSuccessMessage ? (
          <SuccessFeedback message={strategicProfileSuccessMessage} />
        ) : null}

        {activeDossierTab === "summary" ? (
          <div className="grid gap-4">
            <DossierAreaHeader
              description="Visao consolidada do relacionamento, situacao atual e leitura executiva do lead."
              id="dossie-resumo"
              title="Resumo"
            />

            <ExecutiveBriefing items={executiveBriefingItems} />

            <CommercialAttentionDecisionCard
              decision={commercialAttentionDecision}
              error={commercialAttentionError}
              isLoading={isLoadingCommercialAttention}
            />

            <FrictionMap items={frictionMapItems} />

            <KnowledgeGaps items={knowledgeGapItems} />

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
                  <LeadInfo
                    label="Capacidade de investimento mensal"
                    value={monthlyInvestmentCapacity ?? "Não informado"}
                  />
                  {declaredBrazilianAndCpfLabel ? (
                    <LeadInfo
                      label="Brasileiro e possui CPF"
                      value={declaredBrazilianAndCpfLabel}
                    />
                  ) : null}
                  <LeadInfo
                    label="Credito desejado"
                    value={currencyFormatter.format(lead.valorPretendido)}
                  />
                </div>
              </ExecutiveDossierCard>

              <ExecutiveDossierCard
                description="Camada persistente de contexto estrategico vinculada a este lead."
                eyebrow="Relacionamento"
                title="Perfil Estrategico"
              >
                <LeadStrategicProfileCard
                  draft={strategicProfileDraft}
                  error={strategicProfileError}
                  isEditing={isStrategicProfileFormOpen}
                  isLoading={isLoadingStrategicProfile}
                  isSaving={isSavingStrategicProfile}
                  onChange={updateStrategicProfileDraft}
                  onCreate={() => {
                    setStrategicProfileDraft(createEmptyStrategicProfileDraft());
                    setStrategicProfileError(null);
                    setIsStrategicProfileFormOpen(true);
                  }}
                  onEdit={() => {
                    setStrategicProfileDraft(
                      strategicProfile
                        ? mapStrategicProfileToDraft(strategicProfile)
                        : createEmptyStrategicProfileDraft(),
                    );
                    setStrategicProfileError(null);
                    setIsStrategicProfileFormOpen(true);
                  }}
                  onCancel={() => {
                    setStrategicProfileDraft(
                      strategicProfile
                        ? mapStrategicProfileToDraft(strategicProfile)
                        : createEmptyStrategicProfileDraft(),
                    );
                    setStrategicProfileError(null);
                    setIsStrategicProfileFormOpen(false);
                  }}
                  onSave={handleSaveStrategicProfile}
                  profile={strategicProfile}
                />
              </ExecutiveDossierCard>
            </div>

            <ExecutiveDossierCard
              description="Conhecimento estrategico estruturado e vinculado a este lead."
              eyebrow="Organizational Memory"
              title="Memória Organizacional"
            >
              <LeadKnowledgeRegistry
                archivingItemId={archivingKnowledgeId}
                draft={knowledgeDraft}
                error={knowledgeError ?? knowledgeLoadError}
                isCreating={isCreatingKnowledge}
                isFormOpen={isKnowledgeFormOpen}
                isLoading={isLoadingKnowledge}
                items={knowledgeItems}
                onArchive={handleArchiveKnowledgeItem}
                onChange={updateKnowledgeDraft}
                onCloseForm={() => {
                  setKnowledgeDraft(createDefaultKnowledgeDraft());
                  setKnowledgeError(null);
                  setIsKnowledgeFormOpen(false);
                }}
                onCreate={handleCreateKnowledgeItem}
                onOpenForm={() => {
                  setKnowledgeDraft(createDefaultKnowledgeDraft());
                  setKnowledgeError(null);
                  setKnowledgeSuccessMessage(null);
                  setIsKnowledgeFormOpen(true);
                }}
              />
            </ExecutiveDossierCard>

            <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
              <ExecutiveDossierCard
                description="Sinais explicaveis derivados das atividades e artefatos ja registrados."
                eyebrow="Inteligencia"
                title="Check Points"
              >
                <LeadGreenFlags flags={greenFlags} />
              </ExecutiveDossierCard>

              <ExecutiveDossierCard
                description="Primeira leitura operacional para decidir o proximo movimento."
                eyebrow="Operacao"
                title="Estado Atual"
              >
                <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
                  <div className="rounded-md border bg-background/70 p-4 text-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                      Proxima Acao
                    </p>
                    <div className="mt-3">
                      {isLoadingTasks ? (
                        <p className="text-sm text-muted-foreground">
                          Carregando proxima acao...
                        </p>
                      ) : taskLoadError ? (
                        <p className="text-xs leading-5 text-muted-foreground">
                          {taskLoadError}
                        </p>
                      ) : nextPendingTask ? (
                        <TaskSummary task={nextPendingTask} />
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Nenhuma acao programada.
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="rounded-md border bg-background/70 p-4 text-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                      Ultima Movimentacao
                    </p>
                    <div className="mt-3">
                      {latestMovement ? (
                        <>
                          <p className="leading-6 text-foreground">
                            {latestMovement.content}
                          </p>
                          <p className="mt-3 text-xs text-muted-foreground">
                            {dateFormatter.format(new Date(latestMovement.timestamp))}
                          </p>
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Nenhuma movimentacao recente disponivel.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </ExecutiveDossierCard>
            </div>

            <ExecutiveDossierCard
              description="Sintese comercial do ultimo material disponivel sem expor o historico completo."
              eyebrow="Comercial"
              title="Ultimos Artefatos"
            >
              <div className="grid gap-4 xl:grid-cols-2">
                <LeadExecutiveSimulationSummary
                  emptyText="Nenhuma simulacao comercial salva para este lead."
                  simulation={latestCommercialSimulation}
                  title="Ultima Simulacao"
                />
                <LeadExecutiveSimulationSummary
                  emptyText="Nenhum estudo Multi-Cotas salvo para este lead."
                  simulation={latestMultiCotasSimulation}
                  title="Ultimo Estudo Multi-Cotas"
                />
              </div>
            </ExecutiveDossierCard>

            <section className="rounded-md border border-dashed bg-background/50 p-3">
              <button
                aria-expanded={isCommercialDataOpen}
                className="flex w-full items-center justify-between gap-3 text-left"
                onClick={() => setIsCommercialDataOpen((current) => !current)}
                type="button"
              >
                <span>
                  <span className="block text-sm font-medium text-foreground">
                    Ajustes Comerciais
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                    Edicao do lead e propostas existentes ficam recolhidas para nao competir com o resumo executivo.
                  </span>
                </span>
                {isCommercialDataOpen ? (
                  <ChevronUp
                    aria-hidden
                    className="h-4 w-4 shrink-0 text-muted-foreground"
                  />
                ) : (
                  <ChevronDown
                    aria-hidden
                    className="h-4 w-4 shrink-0 text-muted-foreground"
                  />
                )}
              </button>
              {isCommercialDataOpen ? (
                <div className="mt-4 grid gap-4">
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
                </div>
              ) : null}
            </section>
          </div>
        ) : null}

        {activeDossierTab === "timeline" ? (
          <div className="grid gap-4">
            <DossierAreaHeader
              description="Eventos resumidos e transversais do relacionamento."
              id="dossie-timeline"
              title="Timeline"
            />
            <section className="executive-surface rounded-md p-5 text-card-foreground">
              <span className="block text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Timeline
              </span>
              <span className="mt-1 block text-sm font-semibold text-foreground">
                Timeline Operacional
              </span>
              <div className="mt-4">
                <CrmOperationalTimelineList
                  error={timelineError}
                  events={timelineEvents}
                  isLoading={isLoadingTimeline}
                />
              </div>
            </section>
          </div>
        ) : null}

        {activeDossierTab === "simulations" ? (
          <div className="grid gap-4">
            <DossierAreaHeader
              description="Historico comercial do lead com estudos patrimoniais contextualizados."
              id="dossie-simulacoes"
              title="Estudos Patrimoniais"
            />
            <ExecutiveDossierCard
              description="Linha do tempo consolidada de simulacoes comerciais e estrategias Multi-Cotas vinculadas a este lead."
              eyebrow="Estudos"
              title="Estudos Patrimoniais"
            >
              <LeadPatrimonialStudiesHistory
                isLoading={isLoadingSimulations}
                simulations={leadSimulations}
              />
            </ExecutiveDossierCard>

            <ExecutiveDossierCard
              description="Simulacoes comerciais vinculadas a este lead."
              eyebrow="Simulacoes"
              title="Simulacoes Salvas"
            >
              {onGenerateSimulation ? (
                <div className="mb-4 flex flex-col gap-3 rounded-md border bg-background/70 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Criar Simulacao Comercial
                    </p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      Abre a simulacao com este lead como contexto obrigatório.
                    </p>
                  </div>
                  <Button
                    onClick={handleGenerateLeadSimulation}
                    type="button"
                    variant="secondary"
                  >
                    <Plus className="h-4 w-4" aria-hidden />
                    Criar Simulacao Comercial
                  </Button>
                </div>
              ) : null}
              <LeadSimulationHistoryList
                error={simulationsError}
                isLoading={isLoadingSimulations}
                simulations={commercialSimulations}
              />
            </ExecutiveDossierCard>

            <ExecutiveDossierCard
              description="Propostas comerciais preservadas como snapshot historico do lead."
              eyebrow="Propostas"
              title="Propostas Comerciais"
            >
              <LeadCommercialProposalList
                error={commercialProposalsError}
                isLoading={isLoadingCommercialProposals}
                proposals={commercialProposals}
              />
            </ExecutiveDossierCard>

            <ExecutiveDossierCard
              description="Historico de estudos Multi-Cotas vinculados a este lead."
              eyebrow="Estrategia"
              title="Estrategia Multi-Cotas"
            >
              {onGenerateMultiCotas ? (
                <div className="mb-4 flex flex-col gap-3 rounded-md border bg-background/70 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Criar Estrategia Multi-Cotas
                    </p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      Abre o Multi-Cotas com este lead como contexto obrigatorio.
                    </p>
                  </div>
                  <Button
                    onClick={handleGenerateLeadMultiCotas}
                    type="button"
                    variant="secondary"
                  >
                    <Plus className="h-4 w-4" aria-hidden />
                    Criar Estrategia Multi-Cotas
                  </Button>
                </div>
              ) : null}
              <LeadMultiCotasSummary
                error={simulationsError}
                isLoading={isLoadingSimulations}
                leadName={leadDisplayName}
                simulations={multiCotasSimulations}
              />
            </ExecutiveDossierCard>

            <ExecutiveDossierCard
              description="Contratos persistidos originados deste lead."
              eyebrow="Contract Operations"
              title="Contratos"
            >
              <LeadContractsCard
                contracts={leadContracts}
                error={contractsError}
                isLoading={isLoadingContracts}
                leadId={lead.id}
              />
            </ExecutiveDossierCard>
          </div>
        ) : null}

        {activeDossierTab === "tasks-notes" ? (
          <div className="grid gap-4">
            <DossierAreaHeader
              description="Execucao e memoria operacional do lead."
              id="dossie-tarefas-notas"
              title="Tarefas e Notas"
            />

            <ExecutiveDossierCard
              description="Area operacional baseada nas funcionalidades existentes de notas e tasks."
              eyebrow="Operacao"
              title="Tarefas e Notas"
            >
              <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
                <div className="rounded-md border bg-background/70 p-4 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-foreground">Proxima acao</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        Execucao pendente prioritaria deste lead.
                      </p>
                    </div>
                    <span className="rounded-full border bg-card px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                      Destaque
                    </span>
                  </div>
                  <div className="mt-3">
                    {isLoadingTasks ? (
                      <p className="text-sm text-muted-foreground">
                        Carregando proxima acao...
                      </p>
                    ) : taskLoadError ? (
                      <p className="text-xs leading-5 text-muted-foreground">
                        {taskLoadError}
                      </p>
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
                      <div className="grid gap-3">
                        <p className="text-sm text-muted-foreground">
                          Nenhuma acao programada.
                        </p>
                        <Button
                          onClick={handleOpenTaskModal}
                          type="button"
                          variant="secondary"
                        >
                          <Plus className="h-4 w-4" aria-hidden />
                          Criar acao
                        </Button>
                      </div>
                    )}
                    {taskActionError ? (
                      <p className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                        {taskActionError}
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className="rounded-md border bg-background/70 p-4 text-sm">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-medium text-foreground">Notas</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        Registros operacionais do relacionamento com este lead.
                      </p>
                    </div>
                    <Button onClick={handleOpenNoteModal} type="button" variant="secondary">
                      <Plus className="h-4 w-4" aria-hidden />
                      Adicionar Nota
                    </Button>
                  </div>
                  {latestPersistedNote ? (
                    <div className="mt-4 grid gap-3">
                      <div className="rounded-md border bg-card p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                            Ultima nota
                          </p>
                          <time
                            className="text-xs text-muted-foreground"
                            dateTime={latestPersistedNote.timestamp}
                          >
                            {dateFormatter.format(new Date(latestPersistedNote.timestamp))}
                          </time>
                        </div>
                        <p className="mt-3 leading-6 text-foreground">
                          {latestPersistedNote.content}
                        </p>
                        <p className="mt-3 text-xs text-muted-foreground">
                          {latestPersistedNote.author}
                        </p>
                      </div>
                      {historicalPersistedNotes.length ? (
                        <div className="rounded-md border border-dashed bg-background/50 p-3">
                          <button
                            aria-expanded={isNotesHistoryOpen}
                            className="flex w-full items-center justify-between gap-3 text-left"
                            onClick={() => setIsNotesHistoryOpen((current) => !current)}
                            type="button"
                          >
                            <span className="text-sm font-medium text-foreground">
                              Ver historico ({historicalPersistedNotes.length})
                            </span>
                            {isNotesHistoryOpen ? (
                              <ChevronUp
                                aria-hidden
                                className="h-4 w-4 shrink-0 text-muted-foreground"
                              />
                            ) : (
                              <ChevronDown
                                aria-hidden
                                className="h-4 w-4 shrink-0 text-muted-foreground"
                              />
                            )}
                          </button>
                          {isNotesHistoryOpen ? (
                            <div className="mt-3">
                              <CrmStructuredNotesList
                                emptyText="Nenhuma nota operacional registrada ainda."
                                notes={historicalPersistedNotes}
                                variant="compact"
                              />
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="mt-4">
                      <CrmStructuredNotesList
                        emptyText="Nenhuma nota operacional registrada ainda."
                        notes={persistedStructuredNotes}
                      />
                    </div>
                  )}
                </div>
              </div>
            </ExecutiveDossierCard>
          </div>
        ) : null}

        {activeDossierTab === "communications" ? (
          <div className="grid gap-4">
            <DossierAreaHeader
              description="Canal reservado para comunicacoes futuras, sem integracao nesta sprint."
              id="dossie-comunicacoes"
              title="Comunicacoes"
            />
            <MultichannelPlaceholder
              items={["WhatsApp", "E-mail"]}
              title="Comunicacoes"
            />
          </div>
        ) : null}

        {activeDossierTab === "meetings" ? (
          <div className="grid gap-4">
            <DossierAreaHeader
              description="Canal reservado para agenda e encontros futuros, sem integracao nesta sprint."
              id="dossie-reunioes"
              title="Reunioes"
            />
            <MultichannelPlaceholder
              items={["Google Calendar", "Google Meet"]}
              title="Reunioes"
            />
          </div>
        ) : null}

        {activeDossierTab === "calls" ? (
          <div className="grid gap-4">
            <DossierAreaHeader
              description="Canal reservado para chamadas e telefonia futuras, sem integracao nesta sprint."
              id="dossie-ligacoes"
              title="Ligacoes"
            />
            <MultichannelPlaceholder
              items={["Chamadas", "Telefonia"]}
              title="Ligacoes"
            />
          </div>
        ) : null}
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

async function fetchLeadCommercialAttention(
  accessToken: string,
  leadId: string,
) {
  const response = await fetch(
    `/api/crm/lead-commercial-attention?leadId=${encodeURIComponent(leadId)}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  const payload = (await response.json().catch(() => null)) as {
    decision?: CommercialAttentionProductDecision | null;
    error?: string;
  } | null;

  if (!response.ok) {
    throw new Error(
      payload?.error ?? "Nao foi possivel carregar a atencao comercial.",
    );
  }

  return payload?.decision ?? null;
}

function formatCommercialAttentionGeneratedAt(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return dateFormatter.format(date);
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
      <div className="flex flex-wrap items-start justify-between gap-3">
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
        <Button
          disabled={isMutating}
          onClick={onCreateTask}
          size="sm"
          type="button"
          variant="secondary"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Nova acao
        </Button>
      </div>
      <div className="grid gap-2 rounded-md border bg-card p-3">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="font-medium text-foreground">{task.title}</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {formatTaskDueDate(task)}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button
              disabled={isMutating}
              onClick={() => onCompleteTask(task)}
              size="sm"
              type="button"
            >
              <CheckCircle2 className="h-4 w-4" aria-hidden />
              {isCompleting ? "Concluindo..." : "Concluir"}
            </Button>
            <Button
              disabled={isMutating}
              onClick={() => onCancelTask(task)}
              size="sm"
              type="button"
              variant="ghost"
            >
              <XCircle className="h-4 w-4" aria-hidden />
              {isCanceling ? "Cancelando..." : "Cancelar"}
            </Button>
          </div>
        </div>
        {task.notes ? (
          <p className="text-xs leading-5 text-muted-foreground">
            {task.notes}
          </p>
        ) : null}
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

const knowledgeTypeOptions: Array<{
  label: string;
  value: CrmLeadKnowledgeType;
}> = [
  { label: "Financeiro", value: "financial" },
  { label: "Comportamental", value: "behavioral" },
  { label: "Comercial", value: "commercial" },
  { label: "Relacionamento", value: "relationship" },
  { label: "Estrategico", value: "strategic" },
  { label: "Patrimonial", value: "wealth" },
  { label: "Risco", value: "risk" },
  { label: "Objetivo", value: "objective" },
  { label: "Comunicacao", value: "communication" },
  { label: "Objecao", value: "objection" },
  { label: "Motivacao", value: "motivation" },
  { label: "Timing", value: "timing" },
  { label: "Perfil", value: "profile" },
];

const knowledgeTypeLabels = knowledgeTypeOptions.reduce(
  (labels, option) => ({
    ...labels,
    [option.value]: option.label,
  }),
  {} as Record<CrmLeadKnowledgeType, string>,
);

const knowledgeConfidenceOptions: Array<{
  label: string;
  value: CrmLeadKnowledgeConfidence;
}> = [
  { label: "Alta", value: "HIGH" },
  { label: "Media", value: "MEDIUM" },
  { label: "Baixa", value: "LOW" },
  { label: "Desconhecida", value: "UNKNOWN" },
];

const knowledgeConfidenceLabels = knowledgeConfidenceOptions.reduce(
  (labels, option) => ({
    ...labels,
    [option.value]: option.label,
  }),
  {} as Record<CrmLeadKnowledgeConfidence, string>,
);

const evidenceTypeOptions: Array<{
  label: string;
  value: KnowledgeEvidenceType;
}> = [
  { label: "Manual", value: "manual" },
  { label: "Nota", value: "note" },
  { label: "Tarefa", value: "task" },
  { label: "Simulacao", value: "simulation" },
  { label: "Documento", value: "document" },
  { label: "Conversa", value: "conversation" },
];

const evidenceTypeLabels = evidenceTypeOptions.reduce(
  (labels, option) => ({
    ...labels,
    [option.value]: option.label,
  }),
  {} as Record<KnowledgeEvidenceType, string>,
);

function createDefaultTaskDraft(): TaskDraft {
  return {
    dueDate: getLocalDateKey(new Date()),
    dueTime: "",
    notes: "",
    taskType: defaultTaskType,
    title: getDefaultTaskTitle(defaultTaskType),
  };
}

function createDefaultKnowledgeDraft(): KnowledgeDraft {
  return {
    confidence: "MEDIUM",
    knowledgeType: "strategic",
    summary: "",
    title: "",
  };
}

function createDefaultEvidenceDraft(): EvidenceDraft {
  return {
    evidenceType: "manual",
    source: "Manual",
    sourceReference: "",
    summary: "",
    title: "",
  };
}

function createEmptyStrategicProfileDraft(): StrategicProfileDraft {
  return {
    currentMoment: "",
    primaryGoal: "",
    strategicNotes: "",
    strategicTopics: [],
  };
}

function mapStrategicProfileToDraft(
  profile: CrmLeadProfile,
): StrategicProfileDraft {
  return {
    currentMoment: profile.currentMoment ?? "",
    primaryGoal: profile.primaryGoal ?? "",
    strategicNotes: profile.strategicNotes ?? "",
    strategicTopics: profile.strategicTopics,
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
  const temporalStatus = resolveCrmTaskTemporalStatus(task);

  if (temporalStatus === "overdue") {
    return "Atrasada";
  }

  if (temporalStatus === "today") {
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

const dossierNavigationItems: Array<{ key: DossierTabKey; label: string }> = [
  { key: "summary", label: "Resumo" },
  { key: "timeline", label: "Timeline" },
  { key: "simulations", label: "Simulacoes" },
  { key: "tasks-notes", label: "Tarefas e Notas" },
  { key: "communications", label: "Comunicacoes" },
  { key: "meetings", label: "Reunioes" },
  { key: "calls", label: "Ligacoes" },
];

function DossierMultichannelNavigation({
  activeTab,
  className,
  onChange,
}: {
  activeTab: DossierTabKey;
  className?: string;
  onChange: (tab: DossierTabKey) => void;
}) {
  return (
    <nav
      aria-label="Navegacao do Dossie Multicanal"
      className={cn("min-w-0", className)}
    >
      <div className="flex flex-wrap gap-2">
        {dossierNavigationItems.map((item) => (
          <button
            aria-pressed={activeTab === item.key}
            className={cn(
              "rounded-md border px-3 py-2 text-xs font-medium transition",
              activeTab === item.key
                ? "border-primary/45 bg-primary/[0.06] text-foreground"
                : "bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground",
            )}
            key={item.key}
            onClick={() => onChange(item.key)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>
    </nav>
  );
}

function DossierAreaHeader({
  description,
  id,
  title,
}: {
  description: string;
  id: string;
  title: string;
}) {
  return (
    <header className="scroll-mt-24 rounded-md border bg-background/70 p-4" id={id}>
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        Dossie Multicanal
      </p>
      <h3 className="mt-1 text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">
        {description}
      </p>
    </header>
  );
}

function MultichannelPlaceholder({
  items,
  title,
}: {
  items: string[];
  title: string;
}) {
  return (
    <ExecutiveDossierCard
      description="Modulo reservado para evolucao futura, sem integracao ativa."
      eyebrow="Canal futuro"
      title={title}
    >
      <div className="rounded-md border border-dashed bg-background/60 p-4 text-sm text-muted-foreground">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="font-medium text-foreground">Modulo em preparo</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Espaco reservado para centralizar este canal no Dossie.
            </p>
          </div>
          <span className="rounded-full border bg-card px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Futuro
          </span>
        </div>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {items.map((item) => (
            <li
              className="rounded-md border bg-card px-3 py-2 text-foreground"
              key={item}
            >
              {item}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs leading-5">
          Nenhuma integracao externa foi criada ou ativada nesta sprint.
        </p>
      </div>
    </ExecutiveDossierCard>
  );
}

function TaskSummary({ task }: { task: CrmTask }) {
  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-2">
        <span className="rounded-full border bg-background px-2 py-1 text-xs font-medium text-muted-foreground">
          {getTaskDueStatusLabel(task)}
        </span>
        <span className="rounded-full border bg-background px-2 py-1 text-xs font-medium text-muted-foreground">
          {getTaskTypeLabel(task.taskType)}
        </span>
      </div>
      <div className="rounded-md border bg-card p-3">
        <p className="font-medium text-foreground">{task.title}</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          {formatTaskDueDate(task)}
        </p>
        {task.notes ? (
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            {task.notes}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function LeadKnowledgeRegistry({
  archivingItemId,
  draft,
  error,
  isCreating,
  isFormOpen,
  isLoading,
  items,
  onArchive,
  onChange,
  onCloseForm,
  onCreate,
  onOpenForm,
}: {
  archivingItemId: string | null;
  draft: KnowledgeDraft;
  error: string | null;
  isCreating: boolean;
  isFormOpen: boolean;
  isLoading: boolean;
  items: CrmLeadKnowledgeItem[];
  onArchive: (item: CrmLeadKnowledgeItem) => void;
  onChange: (patch: Partial<KnowledgeDraft>) => void;
  onCloseForm: () => void;
  onCreate: () => void;
  onOpenForm: () => void;
}) {
  const [openEvidenceItemId, setOpenEvidenceItemId] = useState<string | null>(null);
  const [evidenceByKnowledgeId, setEvidenceByKnowledgeId] = useState<
    Record<string, KnowledgeEvidence[]>
  >({});
  const [evidenceDraft, setEvidenceDraft] = useState<EvidenceDraft>(() =>
    createDefaultEvidenceDraft(),
  );
  const [evidenceError, setEvidenceError] = useState<string | null>(null);
  const [loadingEvidenceItemId, setLoadingEvidenceItemId] = useState<string | null>(
    null,
  );
  const [creatingEvidenceItemId, setCreatingEvidenceItemId] = useState<
    string | null
  >(null);
  const [archivingEvidenceId, setArchivingEvidenceId] = useState<string | null>(
    null,
  );

  async function handleToggleEvidence(item: CrmLeadKnowledgeItem) {
    if (openEvidenceItemId === item.id) {
      setOpenEvidenceItemId(null);
      setEvidenceError(null);
      setEvidenceDraft(createDefaultEvidenceDraft());
      return;
    }

    setOpenEvidenceItemId(item.id);
    setEvidenceError(null);
    setEvidenceDraft(createDefaultEvidenceDraft());

    if (evidenceByKnowledgeId[item.id]) {
      return;
    }

    setLoadingEvidenceItemId(item.id);

    try {
      const accessToken = await readSupabaseAccessToken();

      if (!accessToken) {
        throw new Error("Sessao invalida.");
      }

      const evidence = await fetchKnowledgeEvidence(accessToken, item.id);

      setEvidenceByKnowledgeId((current) => ({
        ...current,
        [item.id]: evidence,
      }));
    } catch (error) {
      setEvidenceError(
        error instanceof Error
          ? error.message
          : "Nao foi possivel carregar as evidencias.",
      );
    } finally {
      setLoadingEvidenceItemId(null);
    }
  }

  function updateEvidenceDraft(patch: Partial<EvidenceDraft>) {
    setEvidenceDraft((current) => ({
      ...current,
      ...patch,
    }));
  }

  async function handleCreateEvidence(item: CrmLeadKnowledgeItem) {
    const title = evidenceDraft.title.trim();

    if (!title) {
      setEvidenceError("Titulo da evidencia e obrigatorio.");
      return;
    }

    setCreatingEvidenceItemId(item.id);
    setEvidenceError(null);

    try {
      const accessToken = await readSupabaseAccessToken();

      if (!accessToken) {
        throw new Error("Sessao invalida.");
      }

      const evidence = await createKnowledgeEvidence(accessToken, {
        evidenceType: evidenceDraft.evidenceType,
        knowledgeItemId: item.id,
        source: evidenceDraft.source || "Manual",
        sourceReference: evidenceDraft.sourceReference || undefined,
        summary: evidenceDraft.summary || undefined,
        title,
      });

      setEvidenceByKnowledgeId((current) => ({
        ...current,
        [item.id]: [
          evidence,
          ...(current[item.id] ?? []).filter((entry) => entry.id !== evidence.id),
        ],
      }));
      setEvidenceDraft(createDefaultEvidenceDraft());
    } catch (error) {
      setEvidenceError(
        error instanceof Error
          ? error.message
          : "Nao foi possivel criar a evidencia.",
      );
    } finally {
      setCreatingEvidenceItemId(null);
    }
  }

  async function handleArchiveEvidence(
    item: CrmLeadKnowledgeItem,
    evidence: KnowledgeEvidence,
  ) {
    if (archivingEvidenceId) {
      return;
    }

    setArchivingEvidenceId(evidence.id);
    setEvidenceError(null);

    try {
      const accessToken = await readSupabaseAccessToken();

      if (!accessToken) {
        throw new Error("Sessao invalida.");
      }

      await archiveKnowledgeEvidence(accessToken, evidence.id);

      setEvidenceByKnowledgeId((current) => ({
        ...current,
        [item.id]: (current[item.id] ?? []).filter(
          (entry) => entry.id !== evidence.id,
        ),
      }));
    } catch (error) {
      setEvidenceError(
        error instanceof Error
          ? error.message
          : "Nao foi possivel arquivar a evidencia.",
      );
    } finally {
      setArchivingEvidenceId(null);
    }
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">
            Registro estruturado por lead
          </p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Fatos estrategicos declarados pelo consultor, sem inferencia automatica.
          </p>
        </div>
        {!isFormOpen ? (
          <Button onClick={onOpenForm} type="button" variant="secondary">
            <Plus className="h-4 w-4" aria-hidden />
            Adicionar conhecimento
          </Button>
        ) : null}
      </div>

      {isFormOpen ? (
        <div className="rounded-md border bg-background/70 p-4">
          <div className="grid gap-4 md:grid-cols-[1fr_220px_160px]">
            <Field label="Titulo">
              <input
                className={fieldInputClass}
                disabled={isCreating}
                onChange={(event) => onChange({ title: event.target.value })}
                placeholder="Ex.: objetivo patrimonial familiar"
                value={draft.title}
              />
            </Field>

            <Field label="Tipo">
              <select
                className={fieldInputClass}
                disabled={isCreating}
                onChange={(event) =>
                  onChange({
                    knowledgeType: event.target.value as CrmLeadKnowledgeType,
                  })
                }
                value={draft.knowledgeType}
              >
                {knowledgeTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Confianca">
              <select
                className={fieldInputClass}
                disabled={isCreating}
                onChange={(event) =>
                  onChange({
                    confidence: event.target.value as CrmLeadKnowledgeConfidence,
                  })
                }
                value={draft.confidence}
              >
                {knowledgeConfidenceOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Resumo">
            <textarea
              className={cn(fieldInputClass, "min-h-20 resize-y")}
              disabled={isCreating}
              onChange={(event) => onChange({ summary: event.target.value })}
              placeholder="Contexto relevante para decisoes comerciais futuras."
              value={draft.summary}
            />
          </Field>

          <div className="mt-4 flex flex-wrap justify-end gap-3">
            <Button
              disabled={isCreating}
              onClick={onCloseForm}
              type="button"
              variant="ghost"
            >
              Cancelar
            </Button>
            <Button
              disabled={isCreating || !draft.title.trim()}
              onClick={onCreate}
              type="button"
            >
              {isCreating ? "Salvando..." : "Salvar conhecimento"}
            </Button>
          </div>
        </div>
      ) : null}

      {error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {isLoading ? (
        <p className="rounded-md border border-dashed bg-background/60 p-4 text-sm text-muted-foreground">
          Carregando memoria organizacional...
        </p>
      ) : items.length ? (
        <div className="grid gap-3 md:grid-cols-2">
          {items.map((item) => (
            <article
              className="rounded-md border bg-background/70 p-4 text-sm"
              key={item.id}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{item.title}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="rounded-full border bg-card px-2 py-1 text-[11px] font-medium text-muted-foreground">
                      {knowledgeTypeLabels[item.knowledgeType]}
                    </span>
                    <span className="rounded-full border bg-card px-2 py-1 text-[11px] font-medium text-muted-foreground">
                      {knowledgeConfidenceLabels[item.confidence]}
                    </span>
                  </div>
                </div>
                <Button
                  disabled={archivingItemId === item.id}
                  onClick={() => onArchive(item)}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  {archivingItemId === item.id ? "Arquivando..." : "Arquivar"}
                </Button>
              </div>
              {item.summary ? (
                <p className="mt-3 leading-6 text-foreground/85">
                  {item.summary}
                </p>
              ) : (
                <p className="mt-3 text-xs text-muted-foreground">
                  Sem resumo registrado.
                </p>
              )}
              <div className="mt-4 border-t pt-3">
                <Button
                  onClick={() => handleToggleEvidence(item)}
                  size="sm"
                  type="button"
                  variant="secondary"
                >
                  {openEvidenceItemId === item.id
                    ? "Ocultar evidencias"
                    : "Ver evidencias"}
                </Button>
              </div>
              {openEvidenceItemId === item.id ? (
                <KnowledgeEvidencePanel
                  archivingEvidenceId={archivingEvidenceId}
                  draft={evidenceDraft}
                  error={evidenceError}
                  evidence={evidenceByKnowledgeId[item.id] ?? []}
                  isCreating={creatingEvidenceItemId === item.id}
                  isLoading={loadingEvidenceItemId === item.id}
                  onArchive={(evidence) => handleArchiveEvidence(item, evidence)}
                  onChange={updateEvidenceDraft}
                  onCreate={() => handleCreateEvidence(item)}
                />
              ) : null}
            </article>
          ))}
        </div>
      ) : (
        <p className="rounded-md border border-dashed bg-background/60 p-4 text-sm text-muted-foreground">
          Nenhum conhecimento organizacional registrado para este lead.
        </p>
      )}
    </div>
  );
}

function KnowledgeEvidencePanel({
  archivingEvidenceId,
  draft,
  error,
  evidence,
  isCreating,
  isLoading,
  onArchive,
  onChange,
  onCreate,
}: {
  archivingEvidenceId: string | null;
  draft: EvidenceDraft;
  error: string | null;
  evidence: KnowledgeEvidence[];
  isCreating: boolean;
  isLoading: boolean;
  onArchive: (evidence: KnowledgeEvidence) => void;
  onChange: (patch: Partial<EvidenceDraft>) => void;
  onCreate: () => void;
}) {
  return (
    <div className="mt-4 grid gap-3 rounded-md border bg-card/70 p-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Cadeia de evidencias
        </p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          Registros que sustentam este conhecimento. Evidencias arquivadas nao
          aparecem na listagem ativa.
        </p>
      </div>

      <div className="rounded-md border bg-background/70 p-3">
        <div className="grid gap-3 md:grid-cols-[1fr_160px]">
          <Field label="Titulo da evidencia">
            <input
              className={fieldInputClass}
              disabled={isCreating}
              onChange={(event) => onChange({ title: event.target.value })}
              placeholder="Ex.: declaracao em reuniao"
              value={draft.title}
            />
          </Field>

          <Field label="Tipo">
            <select
              className={fieldInputClass}
              disabled={isCreating}
              onChange={(event) =>
                onChange({
                  evidenceType: event.target.value as KnowledgeEvidenceType,
                })
              }
              value={draft.evidenceType}
            >
              {evidenceTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Fonte">
            <input
              className={fieldInputClass}
              disabled={isCreating}
              onChange={(event) => onChange({ source: event.target.value })}
              placeholder="Manual"
              value={draft.source}
            />
          </Field>

          <Field label="Referencia">
            <input
              className={fieldInputClass}
              disabled={isCreating}
              onChange={(event) =>
                onChange({ sourceReference: event.target.value })
              }
              placeholder="Opcional"
              value={draft.sourceReference}
            />
          </Field>
        </div>

        <Field label="Resumo">
          <textarea
            className={cn(fieldInputClass, "min-h-20 resize-y")}
            disabled={isCreating}
            onChange={(event) => onChange({ summary: event.target.value })}
            placeholder="O que esta evidencia comprova?"
            value={draft.summary}
          />
        </Field>

        <div className="mt-3 flex justify-end">
          <Button
            disabled={isCreating || !draft.title.trim()}
            onClick={onCreate}
            size="sm"
            type="button"
          >
            {isCreating ? "Salvando..." : "Adicionar evidencia"}
          </Button>
        </div>
      </div>

      {error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {isLoading ? (
        <p className="rounded-md border border-dashed bg-background/60 p-3 text-xs text-muted-foreground">
          Carregando evidencias...
        </p>
      ) : evidence.length ? (
        <div className="grid gap-2">
          {evidence.map((item) => (
            <article className="rounded-md border bg-background/70 p-3" key={item.id}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {item.title}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="rounded-full border bg-card px-2 py-1 text-[11px] font-medium text-muted-foreground">
                      {evidenceTypeLabels[item.evidenceType]}
                    </span>
                    <span className="rounded-full border bg-card px-2 py-1 text-[11px] font-medium text-muted-foreground">
                      {item.source}
                    </span>
                  </div>
                </div>
                <Button
                  disabled={archivingEvidenceId === item.id}
                  onClick={() => onArchive(item)}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  {archivingEvidenceId === item.id ? "Arquivando..." : "Arquivar"}
                </Button>
              </div>
              {item.summary ? (
                <p className="mt-3 text-xs leading-5 text-foreground/85">
                  {item.summary}
                </p>
              ) : null}
              {item.sourceReference ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Referencia: {item.sourceReference}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      ) : (
        <p className="rounded-md border border-dashed bg-background/60 p-3 text-xs text-muted-foreground">
          Nenhuma evidencia ativa registrada para este conhecimento.
        </p>
      )}
    </div>
  );
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
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const orderedSimulations = [...simulations].sort(sortLeadSimulationsByCreatedAtDesc);
  const latestSimulation = orderedSimulations[0] ?? null;
  const historicalSimulations = orderedSimulations.slice(1);
  const selectedSimulation =
    orderedSimulations.find((simulation) => simulation.id === selectedSimulationId) ??
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
      {latestSimulation ? (
        <div className="grid gap-3">
          <div className="rounded-md border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Ultima simulacao
              </p>
              <time
                className="text-xs text-muted-foreground"
                dateTime={latestSimulation.createdAt}
              >
                {dateFormatter.format(new Date(latestSimulation.createdAt))}
              </time>
            </div>
            <div className="mt-3">
              <LeadSimulationHistoryItem
                isSelected={latestSimulation.id === selectedSimulationId}
                onSelect={() =>
                  setSelectedSimulationId((current) =>
                    current === latestSimulation.id ? null : latestSimulation.id,
                  )
                }
                simulation={latestSimulation}
              />
            </div>
          </div>

          {historicalSimulations.length ? (
            <div className="rounded-md border border-dashed bg-background/50 p-3">
              <button
                aria-expanded={isHistoryOpen}
                className="flex w-full items-center justify-between gap-3 text-left"
                onClick={() => setIsHistoryOpen((current) => !current)}
                type="button"
              >
                <span className="text-sm font-medium text-foreground">
                  Ver historico ({historicalSimulations.length})
                </span>
                {isHistoryOpen ? (
                  <ChevronUp
                    aria-hidden
                    className="h-4 w-4 shrink-0 text-muted-foreground"
                  />
                ) : (
                  <ChevronDown
                    aria-hidden
                    className="h-4 w-4 shrink-0 text-muted-foreground"
                  />
                )}
              </button>
              {isHistoryOpen ? (
                <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {historicalSimulations.map((simulation) => (
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
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
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

function LeadCommercialProposalList({
  error,
  isLoading,
  proposals,
}: {
  error: string | null;
  isLoading: boolean;
  proposals: CrmLeadCommercialProposal[];
}) {
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(
    null,
  );
  const orderedProposals = [...proposals].sort(
    (first, second) =>
      new Date(second.createdAt).getTime() -
      new Date(first.createdAt).getTime(),
  );

  if (isLoading) {
    return (
      <p className="rounded-md border bg-background/70 p-4 text-sm text-muted-foreground">
        Carregando propostas comerciais...
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

  if (!orderedProposals.length) {
    return (
      <p className="rounded-md border border-dashed bg-background/60 p-4 text-sm text-muted-foreground">
        Nenhuma proposta comercial salva neste lead.
      </p>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {orderedProposals.map((proposal) => (
        <article
          className="rounded-md border bg-background/70 p-4 text-sm"
          key={proposal.id}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-medium text-foreground">
                {proposal.title}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {commercialProposalSourceLabels[proposal.sourceSuggestion]}
              </p>
            </div>
            <span className="shrink-0 rounded-full border bg-card px-2 py-1 text-[11px] font-medium text-muted-foreground">
              {dateFormatter.format(new Date(proposal.createdAt))}
            </span>
          </div>
          <div className="mt-4 grid gap-2">
            <LeadInfo
              label="Credito"
              value={formatCurrencyOrDash(
                readProposalSummaryNumber(proposal.summary.commercialCredit),
              )}
            />
            <LeadInfo
              label="Parcela"
              value={formatCurrencyOrDash(
                readProposalSummaryNumber(proposal.summary.monthlyPayment),
              )}
            />
            <LeadInfo
              label="Parcela pos"
              value={formatCurrencyOrDash(
                readProposalSummaryNumber(
                  proposal.summary.postContemplationPayment,
                ),
              )}
            />
            <LeadInfo
              label="Contemplacao"
              value={formatMonthOrDash(
                readProposalSummaryNumber(proposal.summary.contemplationMonth),
              )}
            />
          </div>
          <div className="mt-4">
            <Button
              onClick={() =>
                setSelectedProposalId((current) =>
                  current === proposal.id ? null : proposal.id,
                )
              }
              type="button"
              variant="secondary"
            >
              {selectedProposalId === proposal.id
                ? "Fechar proposta"
                : "Abrir proposta"}
            </Button>
          </div>
          {selectedProposalId === proposal.id ? (
            <LeadCommercialProposalSnapshotDetail proposal={proposal} />
          ) : null}
        </article>
      ))}
    </div>
  );
}

function LeadCommercialProposalSnapshotDetail({
  proposal,
}: {
  proposal: CrmLeadCommercialProposal;
}) {
  return (
    <div className="mt-4 rounded-md border border-dashed bg-card p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        Snapshot persistido
      </p>
      <div className="mt-3 grid gap-3">
        <LeadProposalSnapshotColumn
          label="Sugestao original"
          snapshot={proposal.originalSnapshot}
        />
        <LeadProposalSnapshotColumn
          label="Proposta salva"
          snapshot={proposal.savedSnapshot}
        />
      </div>
    </div>
  );
}

function LeadProposalSnapshotColumn({
  label,
  snapshot,
}: {
  label: string;
  snapshot: Record<string, unknown>;
}) {
  return (
    <div className="rounded-md border bg-background/60 p-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="mt-2 grid gap-2">
        <LeadInfo
          label="Credito"
          value={formatCurrencyOrDash(
            readProposalSnapshotNumber(snapshot, "commercialCredit"),
          )}
        />
        <LeadInfo
          label="Parcela"
          value={formatCurrencyOrDash(
            readProposalSnapshotNumber(
              snapshot,
              "installmentBeforeContemplation",
            ),
          )}
        />
        <LeadInfo
          label="Venda estimada"
          value={formatCurrencyOrDash(
            readProposalSnapshotNumber(snapshot, "estimatedCardSaleValue"),
          )}
        />
        <LeadInfo
          label="Lucro"
          value={formatCurrencyOrDash(
            readProposalSnapshotNumber(snapshot, "estimatedCardSaleProfit"),
          )}
        />
      </div>
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
  const [isExpanded, setIsExpanded] = useState(false);

  if (!flags.length) {
    return (
      <p className="rounded-md border border-dashed bg-background/60 p-4 text-sm text-muted-foreground">
        Nenhum Check Point identificado.
      </p>
    );
  }

  return (
    <div className="rounded-md border bg-background/70 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800">
              {flags.length} Check Points
            </span>
          </div>
          <p className="mt-3 text-sm font-medium text-foreground">
            {flags.length === 1
              ? "1 sinal relevante identificado para este lead."
              : `${flags.length} sinais relevantes identificados para este lead.`}
          </p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Os sinais individuais permanecem disponiveis sob demanda.
          </p>
        </div>
        <button
          aria-expanded={isExpanded}
          className="shrink-0 text-sm font-medium text-primary transition hover:text-primary/80"
          onClick={() => setIsExpanded((current) => !current)}
          type="button"
        >
          {isExpanded ? "Ocultar detalhes" : "Ver detalhes"}
        </button>
      </div>
      {isExpanded ? (
        <ul className="mt-4 grid gap-3 md:grid-cols-2">
          {flags.map((flag) => (
            <li
              className="flex items-start gap-3 rounded-md border bg-card px-3 py-3 text-sm text-foreground"
              key={flag.type}
            >
              <CheckCircle2
                aria-hidden
                className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600"
              />
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-emerald-700">
                  Check Point
                </p>
                <p className="mt-1">{flag.description}</p>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function ExecutiveBriefing({
  items,
}: {
  items: ReturnType<typeof buildExecutiveBriefing>;
}) {
  return (
    <section className="executive-surface rounded-md p-4 text-card-foreground">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Executive Briefing
          </p>
          <h3 className="mt-1 text-base font-semibold text-foreground">
            O que esta acontecendo agora
          </h3>
        </div>
        <span className="text-xs font-medium text-muted-foreground">
          Leitura rapida
        </span>
      </div>

      <dl className="mt-4 grid gap-2">
        {items.map((item) => (
          <div
            className="grid gap-1 rounded-md border bg-background/70 px-3 py-2 sm:grid-cols-[170px_1fr] sm:items-center"
            key={item.label}
          >
            <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              {item.label}
            </dt>
            <dd className="text-sm font-medium leading-5 text-foreground">
              {item.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function CommercialAttentionDecisionCard({
  decision,
  error,
  isLoading,
}: {
  decision: CommercialAttentionProductDecision | null;
  error: string | null;
  isLoading: boolean;
}) {
  return (
    <section className="rounded-md border bg-background/70 p-4 text-card-foreground">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            DM-001
          </p>
          <h3 className="mt-1 text-sm font-semibold text-foreground">
            Atencao Comercial
          </h3>
        </div>
        <span className="text-xs font-medium text-muted-foreground">
          Decision Model
        </span>
      </div>

      {isLoading ? (
        <p className="mt-4 rounded-md border border-dashed bg-card px-3 py-3 text-sm text-muted-foreground">
          Carregando decisao comercial...
        </p>
      ) : error ? (
        <p className="mt-4 rounded-md border border-dashed bg-card px-3 py-3 text-sm text-muted-foreground">
          {error}
        </p>
      ) : decision ? (
        <div className="mt-4 grid gap-3">
          <div className="grid gap-2 md:grid-cols-3">
            <LeadInfo label="Decisao" value={decision.decision} />
            <LeadInfo
              label="Score"
              value={
                decision.attentionScore === null
                  ? "Nao calculado"
                  : String(decision.attentionScore)
              }
            />
            <LeadInfo label="Confianca" value={decision.confidence} />
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            <LeadInfo
              label="Acao recomendada"
              value={decision.recommendedAction}
            />
            <LeadInfo
              label="Gerado em"
              value={formatCommercialAttentionGeneratedAt(decision.generatedAt)}
            />
          </div>
          <div className="rounded-md border bg-card px-3 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Racional
            </p>
            <p className="mt-1 text-sm leading-5 text-foreground">
              {decision.rationaleSummary}
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Modelo {decision.modelVersion}
          </p>
        </div>
      ) : (
        <p className="mt-4 rounded-md border border-dashed bg-card px-3 py-3 text-sm text-muted-foreground">
          Nenhuma decisao comercial registrada para este lead.
        </p>
      )}
    </section>
  );
}

function FrictionMap({ items }: { items: ReturnType<typeof buildFrictionMap> }) {
  return (
    <section className="rounded-md border bg-background/70 p-4 text-card-foreground">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Friction Map
          </p>
          <h3 className="mt-1 text-sm font-semibold text-foreground">
            O que impede a evolucao agora
          </h3>
        </div>
        <span className="text-xs font-medium text-muted-foreground">
          Ate 3 atritos
        </span>
      </div>

      {items.length ? (
        <ul className="mt-4 grid gap-3 md:grid-cols-3">
          {items.map((item) => (
            <li
              className="rounded-md border bg-card px-3 py-3 text-sm text-foreground"
              key={item.title}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Atrito
              </p>
              <p className="mt-1 font-medium">{item.title}</p>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                {item.description}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 rounded-md border border-dashed bg-card px-3 py-3 text-sm text-muted-foreground">
          Nenhum atrito evidente com os dados atuais.
        </p>
      )}
    </section>
  );
}

function KnowledgeGaps({ items }: { items: KnowledgeGapItem[] }) {
  return (
    <section className="rounded-md border bg-background/70 p-4 text-card-foreground">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Knowledge Gaps
          </p>
          <h3 className="mt-1 text-sm font-semibold text-foreground">
            O que ainda precisamos descobrir
          </h3>
        </div>
        <span className="text-xs font-medium text-muted-foreground">
          Ate 5 lacunas
        </span>
      </div>

      {items.length ? (
        <ul className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <li
              className="rounded-md border bg-card px-3 py-3 text-sm text-foreground"
              key={item.title}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Lacuna
              </p>
              <p className="mt-1 font-medium">{item.title}</p>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                {item.description}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 rounded-md border border-dashed bg-card px-3 py-3 text-sm text-muted-foreground">
          Nenhuma lacuna relevante identificada com os dados atuais.
        </p>
      )}
    </section>
  );
}

type KnowledgeGapItem = {
  description: string;
  title: string;
};

function buildKnowledgeGaps({
  commercialSimulations,
  knowledgeItems,
  lead,
  multiCotasSimulations,
  strategicProfile,
}: {
  commercialSimulations: CrmLeadSimulation[];
  knowledgeItems: CrmLeadKnowledgeItem[];
  lead: CrmLead;
  multiCotasSimulations: CrmLeadSimulation[];
  strategicProfile: CrmLeadProfile | null;
}): KnowledgeGapItem[] {
  const gaps: KnowledgeGapItem[] = [];

  if (!hasLeadObjectiveData(lead)) {
    gaps.push({
      description: "Produto, oportunidade e credito desejado ainda nao orientam o relacionamento.",
      title: "Objetivo comercial nao registrado",
    });
  }

  if (!strategicProfile?.primaryGoal) {
    gaps.push({
      description: "O Perfil Estrategico ainda nao informa o objetivo principal.",
      title: "Objetivo estrategico nao definido",
    });
  }

  if (!strategicProfile?.currentMoment) {
    gaps.push({
      description: "O momento atual do cliente ainda nao esta registrado.",
      title: "Momento atual nao definido",
    });
  }

  if (!strategicProfile?.strategicTopics.length) {
    gaps.push({
      description: "Nao ha temas patrimoniais marcados no Perfil Estrategico.",
      title: "Temas patrimoniais nao mapeados",
    });
  }

  if (!knowledgeItems.length) {
    gaps.push({
      description: "A Memoria Organizacional ainda nao possui itens ativos.",
      title: "Memoria Organizacional vazia",
    });
  }

  if (!hasKnowledgeType(knowledgeItems, ["financial", "wealth"])) {
    gaps.push({
      description: "Nao ha conhecimento financeiro ou patrimonial estruturado.",
      title: "Contexto patrimonial nao registrado",
    });
  }

  if (!commercialSimulations.length && !multiCotasSimulations.length) {
    gaps.push({
      description: "Nenhuma simulacao foi salva para materializar o cenario.",
      title: "Cenario de simulacao ausente",
    });
  }

  if (commercialSimulations.length && !multiCotasSimulations.length) {
    gaps.push({
      description: "Ha simulacao comercial, mas nenhum estudo Multi-Cotas salvo.",
      title: "Multi-Cotas ainda nao registrado",
    });
  }

  return gaps.slice(0, 5);
}

function hasLeadObjectiveData(lead: CrmLead) {
  return Boolean(
    lead.produtoInteresse.trim() ||
      lead.tituloOportunidade?.trim() ||
      lead.valorPretendido > 0,
  );
}

function hasKnowledgeType(
  items: CrmLeadKnowledgeItem[],
  types: CrmLeadKnowledgeItem["knowledgeType"][],
) {
  return items.some((item) => types.includes(item.knowledgeType));
}

function LeadStrategicProfileCard({
  draft,
  error,
  isEditing,
  isLoading,
  isSaving,
  onCancel,
  onChange,
  onCreate,
  onEdit,
  onSave,
  profile,
}: {
  draft: StrategicProfileDraft;
  error: string | null;
  isEditing: boolean;
  isLoading: boolean;
  isSaving: boolean;
  onCancel: () => void;
  onChange: (patch: Partial<StrategicProfileDraft>) => void;
  onCreate: () => void;
  onEdit: () => void;
  onSave: () => void;
  profile: CrmLeadProfile | null;
}) {
  if (isLoading) {
    return (
      <p className="rounded-md border border-dashed bg-background/60 p-4 text-sm text-muted-foreground">
        Carregando perfil estrategico...
      </p>
    );
  }

  if (!profile && !isEditing) {
    return (
      <div className="rounded-md border border-dashed bg-background/60 p-4 text-sm">
        <p className="font-medium text-foreground">
          Perfil Estrategico ainda nao preenchido.
        </p>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">
          Registre objetivo principal, momento atual, temas relevantes e contexto
          estrategico deste lead.
        </p>
        {error ? (
          <p className="mt-3 text-xs leading-5 text-destructive">{error}</p>
        ) : null}
        <div className="mt-4">
          <Button onClick={onCreate} type="button" variant="secondary">
            <Plus className="h-4 w-4" aria-hidden />
            Criar Perfil Estrategico
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {profile && !isEditing ? (
        <div className="grid gap-4">
          <div className="grid gap-3 text-sm md:grid-cols-2">
            <LeadInfo
              label="Objetivo Principal"
              value={profile.primaryGoal || "-"}
            />
            <LeadInfo
              label="Momento Atual"
              value={profile.currentMoment || "-"}
            />
          </div>
          <div className="rounded-md border bg-background/70 p-4 text-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Temas Relevantes
            </p>
            <p className="mt-2 leading-6 text-foreground">
              {profile.strategicTopics.length
                ? profile.strategicTopics.join(", ")
                : "-"}
            </p>
          </div>
          <div className="rounded-md border bg-background/70 p-4 text-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Observacoes Estrategicas
            </p>
            <p className="mt-2 whitespace-pre-wrap leading-6 text-foreground">
              {profile.strategicNotes || "-"}
            </p>
          </div>
          {error ? (
            <p className="text-xs leading-5 text-destructive">{error}</p>
          ) : null}
          <div>
            <Button onClick={onEdit} type="button" variant="secondary">
              Editar Perfil Estrategico
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Objetivo Principal">
              <select
                className={fieldInputClass}
                onChange={(event) =>
                  onChange({
                    primaryGoal: event.target.value as StrategicProfileDraft["primaryGoal"],
                  })
                }
                value={draft.primaryGoal}
              >
                <option value="">Selecione</option>
                {crmLeadProfilePrimaryGoals.map((goal) => (
                  <option key={goal} value={goal}>
                    {goal}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Momento Atual">
              <select
                className={fieldInputClass}
                onChange={(event) =>
                  onChange({
                    currentMoment: event.target.value as StrategicProfileDraft["currentMoment"],
                  })
                }
                value={draft.currentMoment}
              >
                <option value="">Selecione</option>
                {crmLeadProfileCurrentMoments.map((moment) => (
                  <option key={moment} value={moment}>
                    {moment}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Temas Relevantes">
            <div className="grid gap-2 sm:grid-cols-2">
              {crmLeadProfileStrategicTopics.map((topic) => {
                const isSelected = draft.strategicTopics.includes(topic);

                return (
                  <label
                    className={cn(
                      "flex items-center gap-2 rounded-md border bg-background/70 px-3 py-2 text-sm",
                      isSelected ? "border-primary/45 bg-primary/[0.04]" : null,
                    )}
                    key={topic}
                  >
                    <input
                      checked={isSelected}
                      className="h-4 w-4"
                      onChange={(event) =>
                        onChange({
                          strategicTopics: event.target.checked
                            ? [...draft.strategicTopics, topic]
                            : draft.strategicTopics.filter((item) => item !== topic),
                        })
                      }
                      type="checkbox"
                    />
                    <span>{topic}</span>
                  </label>
                );
              })}
            </div>
          </Field>

          <Field label="Observacoes Estrategicas">
            <textarea
              className={cn(fieldInputClass, "min-h-28 resize-y")}
              onChange={(event) =>
                onChange({
                  strategicNotes: event.target.value,
                })
              }
              placeholder="Contexto patrimonial, momento de vida, preocupacoes recorrentes e temas de interesse."
              value={draft.strategicNotes}
            />
          </Field>

          {error ? (
            <p className="text-xs leading-5 text-destructive">{error}</p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button disabled={isSaving} onClick={onSave} type="button">
              {isSaving ? "Salvando..." : profile ? "Salvar Perfil Estrategico" : "Criar Perfil Estrategico"}
            </Button>
            <Button disabled={isSaving} onClick={onCancel} type="button" variant="ghost">
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function LeadExecutiveSimulationSummary({
  emptyText,
  simulation,
  title,
}: {
  emptyText: string;
  simulation: CrmLeadSimulation | null;
  title: string;
}) {
  const credit =
    simulation?.commercialCredit ??
    simulation?.updatedCredit ??
    simulation?.totalCredit ??
    null;

  return (
    <div className="rounded-md border bg-background/70 p-4 text-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {title}
      </p>
      {simulation ? (
        <div className="mt-3 grid gap-3">
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
          <div className="grid gap-2 md:grid-cols-2">
            <LeadInfo
              label="Credito"
              value={typeof credit === "number" ? currencyFormatter.format(credit) : "-"}
            />
            <LeadInfo
              label="Parcela"
              value={
                typeof simulation.monthlyPayment === "number"
                  ? currencyFormatter.format(simulation.monthlyPayment)
                  : "-"
              }
            />
          </div>
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">{emptyText}</p>
      )}
    </div>
  );
}

function LeadPatrimonialStudiesHistory({
  isLoading,
  simulations,
}: {
  isLoading: boolean;
  simulations: CrmLeadSimulation[];
}) {
  const studies = [...simulations].sort(sortLeadSimulationsByCreatedAtDesc);

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Carregando estudos...</p>;
  }

  if (!studies.length) {
    return (
      <p className="rounded-md border border-dashed bg-background/60 p-4 text-sm text-muted-foreground">
        Nenhum estudo patrimonial vinculado a este lead.
      </p>
    );
  }

  return (
    <div className="grid gap-3">
      {studies.map((study) => (
        <article
          className="flex flex-col gap-3 rounded-md border bg-background/70 p-4 sm:flex-row sm:items-start sm:justify-between"
          key={study.id}
        >
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border bg-card px-2 py-1 text-xs font-medium text-muted-foreground">
                {resolvePatrimonialStudyTypeLabel(study.simulationType)}
              </span>
              <span className="rounded-full border bg-card px-2 py-1 text-xs font-medium text-muted-foreground">
                {resolveSimulationStatusLabel(study.status)}
              </span>
              {study.pdfGeneratedAt ? (
                <span className="rounded-full border border-primary/20 bg-primary/5 px-2 py-1 text-xs font-medium text-primary">
                  PDF associado
                </span>
              ) : null}
            </div>
            <p className="mt-3 text-sm font-medium text-foreground">
              {study.title}
            </p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Responsavel: {study.createdBy ?? "Nao informado"}
            </p>
          </div>
          <div className="shrink-0 text-xs text-muted-foreground sm:text-right">
            <time dateTime={study.createdAt}>
              {dateFormatter.format(new Date(study.createdAt))}
            </time>
            {study.pdfGeneratedAt ? (
              <p className="mt-1">
                PDF em {dateFormatter.format(new Date(study.pdfGeneratedAt))}
              </p>
            ) : null}
          </div>
        </article>
      ))}
    </div>
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
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const orderedSimulations = [...simulations].sort(sortLeadSimulationsByCreatedAtDesc);
  const latestSimulation = orderedSimulations[0] ?? null;
  const historicalSimulations = orderedSimulations.slice(1);
  const selectedSimulation =
    orderedSimulations.find((simulation) => simulation.id === selectedSimulationId) ??
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
    <div className="grid gap-4">
      {latestSimulation ? (
        <div className="grid gap-3">
          <div className="rounded-md border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Ultimo estudo Multi-Cotas
              </p>
              <time
                className="text-xs text-muted-foreground"
                dateTime={latestSimulation.createdAt}
              >
                {dateFormatter.format(new Date(latestSimulation.createdAt))}
              </time>
            </div>
            <div className="mt-3">
              <LeadMultiCotasHistoryItem
                onOpen={() => setSelectedSimulationId(latestSimulation.id)}
                simulation={latestSimulation}
              />
            </div>
          </div>

          {historicalSimulations.length ? (
            <div className="rounded-md border border-dashed bg-background/50 p-3">
              <button
                aria-expanded={isHistoryOpen}
                className="flex w-full items-center justify-between gap-3 text-left"
                onClick={() => setIsHistoryOpen((current) => !current)}
                type="button"
              >
                <span className="text-sm font-medium text-foreground">
                  Ver historico ({historicalSimulations.length})
                </span>
                {isHistoryOpen ? (
                  <ChevronUp
                    aria-hidden
                    className="h-4 w-4 shrink-0 text-muted-foreground"
                  />
                ) : (
                  <ChevronDown
                    aria-hidden
                    className="h-4 w-4 shrink-0 text-muted-foreground"
                  />
                )}
              </button>
              {isHistoryOpen ? (
                <div className="mt-3 grid gap-3">
                  {historicalSimulations.map((simulation) => (
                    <LeadMultiCotasHistoryItem
                      key={simulation.id}
                      onOpen={() => setSelectedSimulationId(simulation.id)}
                      simulation={simulation}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
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
  if (isReferenceCapitalStrategySnapshot(snapshot)) {
    return (
      <ReferenceCapitalSavedStrategyDetail
        onClose={onClose}
        simulation={simulation}
        snapshot={snapshot}
      />
    );
  }

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

function ReferenceCapitalSavedStrategyDetail({
  onClose,
  simulation,
  snapshot,
}: {
  onClose: () => void;
  simulation: CrmLeadSimulation;
  snapshot: ReferenceCapitalStrategySnapshot;
}) {
  const result = snapshot.result;
  const [publicationSnapshot, setPublicationSnapshot] = useState<
    Record<string, unknown>
  >(simulation.presentationSnapshot);
  const publications = readPublicationsFromStrategySnapshot(publicationSnapshot);
  const latestPublication =
    publications
      .filter((publication) => publication.strategyVersion === 1)
      .sort(
        (left, right) =>
          right.publicationVersion - left.publicationVersion ||
          right.createdAt.localeCompare(left.createdAt),
      )[0] ?? null;

  if (!isReferenceCapitalStrategySnapshot(snapshot)) {
    return null;
  }

  async function savePublication(publication: PatrimonialPublication) {
    const accessToken = await readSupabaseAccessToken();

    if (!accessToken) {
      throw new Error("Sessao Supabase indisponivel. Faca login novamente.");
    }

    const response = await fetch("/api/crm/lead-simulations", {
      body: JSON.stringify({
        publication,
        simulationId: simulation.id,
      }),
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      method: "PATCH",
    });
    const body = (await response.json().catch(() => null)) as {
      error?: string;
      simulation?: CrmLeadSimulation;
    } | null;

    if (!response.ok || !body?.simulation) {
      throw new Error(
        body?.error ?? "Nao foi possivel salvar a publicacao.",
      );
    }

    setPublicationSnapshot(body.simulation.presentationSnapshot);
  }

  return (
    <section className="rounded-md border bg-card p-5 text-card-foreground">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Estrategia Patrimonial salva
          </p>
          <h4 className="mt-1 text-base font-semibold text-foreground">
            {simulation.title}
          </h4>
          <p className="mt-1 text-xs text-muted-foreground">
            Grupo Exclusivo Referencia Capital -{" "}
            {dateFormatter.format(new Date(simulation.createdAt))}
          </p>
        </div>
        <Button onClick={onClose} type="button" variant="ghost">
          Fechar detalhe
        </Button>
      </div>

      <div className="mt-5 grid gap-5">
        <SimulationDetailSection title="Resumo">
          <SimulationDetailGrid>
            <LeadInfo
              label="Credito total contratado"
              value={formatCentsAsCurrency(result.consolidated.totalCreditCents)}
            />
            <LeadInfo
              label="Quantidade de cotas"
              value={String(result.consolidated.quotaCount)}
            />
            <LeadInfo
              label="Parcela - meses 1 a 12"
              value={formatCentsAsCurrency(
                result.consolidated.installmentMonths1To12Cents,
              )}
            />
            <LeadInfo
              label="Parcela - meses 13 a 24"
              value={formatCentsAsCurrency(
                result.consolidated.installmentMonths13To24Cents,
              )}
            />
            <LeadInfo
              label="Parcela-base - meses 25 a 216"
              value={formatCentsAsCurrency(
                result.consolidated.installmentMonths25To216Cents,
              )}
            />
          </SimulationDetailGrid>
        </SimulationDetailSection>

        <SimulationDetailSection title="Produto e regras">
          <SimulationDetailGrid>
            <LeadInfo label="Produto" value="Grupo Exclusivo Referencia Capital" />
            <LeadInfo label="Versao" value={snapshot.financialProductVersion} />
            <LeadInfo label="Engine" value={snapshot.calculationEngineKey} />
            <LeadInfo label="Plano" value="216 meses" />
            <LeadInfo label="Seguro" value="Prestamista incluso na parcela" />
            <LeadInfo label="Atualizacao" value="INCC anual, primeiro reajuste na 14a parcela" />
          </SimulationDetailGrid>
        </SimulationDetailSection>

        <SimulationDetailSection title="Cotas">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {result.quotas.map((quota, index) => (
              <article
                className="rounded-md border bg-background/70 p-4 text-sm"
                key={quota.id}
              >
                <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
                  Cota {quota.position} - {quota.catalogCode}
                </p>
                <p className="mt-2 text-lg font-semibold text-foreground">
                  {formatCentsAsCurrency(quota.creditCents)}
                </p>
                <div className="mt-4 grid gap-2 text-xs text-muted-foreground">
                  <span>
                    Meses 1 a 12:{" "}
                    {formatCentsAsCurrency(quota.installmentMonths1To12Cents)}
                  </span>
                  <span>
                    Meses 13 a 24:{" "}
                    {formatCentsAsCurrency(quota.installmentMonths13To24Cents)}
                  </span>
                  <span>
                    Meses 25 a 216:{" "}
                    {formatCentsAsCurrency(quota.installmentMonths25To216Cents)}
                  </span>
                  <span>
                    Cenário de contemplação: mês{" "}
                    {resolveReferenceCapitalQuotaScenarioMonth(snapshot, quota.id, index)}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </SimulationDetailSection>

        <SimulationDetailSection title="Cenario editorial">
          <SimulationDetailGrid>
            <LeadInfo
              label="Cenarios por cota"
              value={result.quotas
                .map(
                  (quota, index) =>
                    `Cota ${quota.position}: mes ${resolveReferenceCapitalQuotaScenarioMonth(
                      snapshot,
                      quota.id,
                      index,
                    )}`,
                )
                .join(" | ")}
            />
            <LeadInfo
              label="Exibir no material"
              value={resolveReferenceCapitalEditorialPreference(snapshot) ? "Sim" : "Nao"}
            />
          </SimulationDetailGrid>
        </SimulationDetailSection>

        <PublicationBuilderPanel
          createdBy={simulation.createdBy}
          initialPublication={latestPublication}
          onPreparePublication={savePublication}
          onSaveDraft={savePublication}
          strategyId={`strategy:${simulation.organizationId}:${simulation.leadId}:${simulation.id}`}
          strategySnapshot={snapshot}
          strategyTitle={simulation.title}
          strategyVersion={1}
        />
      </div>
    </section>
  );
}

function resolveReferenceCapitalQuotaScenarioMonth(
  snapshot: ReferenceCapitalStrategySnapshot,
  quotaId: string,
  index: number,
) {
  const inputQuota = snapshot.input.quotas.find((quota) => quota.id === quotaId);
  const candidate =
    typeof inputQuota?.contemplationScenarioMonth === "number"
      ? inputQuota.contemplationScenarioMonth
      : readLegacyReferenceCapitalScenarioMonth(snapshot);

  return typeof candidate === "number" && Number.isInteger(candidate)
    ? candidate
    : Math.min(216, (index + 1) * 12);
}

function resolveReferenceCapitalEditorialPreference(
  snapshot: ReferenceCapitalStrategySnapshot,
) {
  const input = snapshot.input as ReferenceCapitalStrategySnapshot["input"] & {
    includeContemplationScenarioInMaterial?: boolean;
  };

  return (
    input.includeContemplationScenariosInMaterial ??
    input.includeContemplationScenarioInMaterial ??
    false
  );
}

function readLegacyReferenceCapitalScenarioMonth(
  snapshot: ReferenceCapitalStrategySnapshot,
) {
  const input = snapshot.input as ReferenceCapitalStrategySnapshot["input"] & {
    contemplationScenarioMonth?: number | null;
  };

  return typeof input.contemplationScenarioMonth === "number"
    ? input.contemplationScenarioMonth
    : null;
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
  contract_created: "border-l-4 border-l-emerald-300",
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
  contract_created: "Contrato criado",
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

const commercialProposalSourceLabels: Record<
  CrmLeadCommercialProposal["sourceSuggestion"],
  string
> = {
  conservative: "Conservadora",
  patrimonial: "Patrimonial",
  recommended: "Recomendada",
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
  if (isReferenceCapitalStrategySnapshot(calculationSnapshot)) {
    const result = calculationSnapshot.result;
    const financialSummary = [
      `Credito total: ${formatCentsAsCurrency(result.consolidated.totalCreditCents)}`,
      `Meses 1 a 12: ${formatCentsAsCurrency(result.consolidated.installmentMonths1To12Cents)}`,
      `Meses 13 a 24: ${formatCentsAsCurrency(result.consolidated.installmentMonths13To24Cents)}`,
      `Meses 25 a 216: ${formatCentsAsCurrency(result.consolidated.installmentMonths25To216Cents)}`,
    ];

    return {
      financialSummary,
      quotaCount: result.consolidated.quotaCount,
    };
  }

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

function resolvePatrimonialStudyTypeLabel(type: CrmLeadSimulation["simulationType"]) {
  return type === "multi_cotas" ? "Estrategia Multi-Cotas" : "Simulacao Comercial";
}

function resolveSimulationStatusLabel(status: CrmLeadSimulation["status"]) {
  const labels: Record<CrmLeadSimulation["status"], string> = {
    archived: "Arquivado",
    draft: "Rascunho",
    pdf_generated: "PDF gerado",
    pdf_sent: "PDF enviado",
    presented: "Apresentado",
    proposal_generated: "Proposta gerada",
  };

  return labels[status] ?? status;
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

function formatCentsAsCurrency(cents: number) {
  return currencyFormatter.format(centsToCurrencyAmount(cents));
}

function readProposalSummaryNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readProposalSnapshotNumber(
  snapshot: Record<string, unknown>,
  key: string,
) {
  const presentation =
    snapshot.presentation &&
    typeof snapshot.presentation === "object" &&
    !Array.isArray(snapshot.presentation)
      ? (snapshot.presentation as Record<string, unknown>)
      : null;
  const value = presentation?.[key];

  return typeof value === "number" && Number.isFinite(value) ? value : null;
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
