import { crmPipelineLabels, crmStageLabels } from "./crm-engine";
import type { CrmLeadGreenFlag } from "./crm-green-flags";
import type { CrmLeadKnowledgeItem } from "./crm-lead-knowledge";
import type { CrmLeadProfile } from "./crm-lead-profiles";
import type { CrmLeadSimulation } from "./crm-lead-simulations";
import type { CrmStructuredNote } from "./crm-structured-notes";
import type { CrmTask } from "./crm-tasks";
import { resolveCrmTaskTemporalStatus } from "./crm-tasks";
import type { CrmOperationalTimelineEvent } from "./crm-timeline";
import type { CrmLead } from "./crm-types";

type ExecutiveBriefingItem = {
  label: string;
  value: string;
};

export function buildExecutiveBriefing({
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
}: {
  greenFlags: CrmLeadGreenFlag[];
  knowledgeItems: CrmLeadKnowledgeItem[];
  latestCommercialSimulation: CrmLeadSimulation | null;
  latestMovement: CrmStructuredNote | null | undefined;
  latestMultiCotasSimulation: CrmLeadSimulation | null;
  lead: CrmLead;
  leadSimulations: CrmLeadSimulation[];
  nextPendingTask: CrmTask | null;
  strategicProfile: CrmLeadProfile | null;
  timelineEvents: CrmOperationalTimelineEvent[];
}): ExecutiveBriefingItem[] {
  return [
    {
      label: "Estado atual",
      value: buildExecutiveBriefingStateLine(lead),
    },
    {
      label: "Maior ativo conhecido",
      value: buildExecutiveBriefingAssetLine({
        greenFlags,
        knowledgeItems,
        latestCommercialSimulation,
        latestMultiCotasSimulation,
        strategicProfile,
      }),
    },
    {
      label: "Maior risco",
      value: buildExecutiveBriefingRiskLine({
        latestMovement,
        nextPendingTask,
        timelineEvents,
      }),
    },
    {
      label: "Maior lacuna",
      value: buildExecutiveBriefingGapLine({
        knowledgeItems,
        leadSimulations,
        latestMovement,
        strategicProfile,
      }),
    },
    {
      label: "Prioridade imediata",
      value: buildExecutiveBriefingPriorityLine({
        knowledgeItems,
        latestMovement,
        nextPendingTask,
      }),
    },
  ];
}

function buildExecutiveBriefingStateLine(lead: CrmLead) {
  const pipeline = crmPipelineLabels[lead.pipeline] ?? lead.pipeline;
  const stage = crmStageLabels[lead.etapa] ?? lead.etapa;

  return `${pipeline}: ${stage}.`;
}

function buildExecutiveBriefingAssetLine({
  greenFlags,
  knowledgeItems,
  latestCommercialSimulation,
  latestMultiCotasSimulation,
  strategicProfile,
}: {
  greenFlags: CrmLeadGreenFlag[];
  knowledgeItems: CrmLeadKnowledgeItem[];
  latestCommercialSimulation: CrmLeadSimulation | null;
  latestMultiCotasSimulation: CrmLeadSimulation | null;
  strategicProfile: CrmLeadProfile | null;
}) {
  if (latestMultiCotasSimulation) {
    return "Recebeu estudo Multi-Cotas.";
  }

  if (latestCommercialSimulation) {
    return "Possui simulacao comercial salva.";
  }

  if (hasStrategicProfileContent(strategicProfile)) {
    return "Perfil estrategico iniciado.";
  }

  if (knowledgeItems.length) {
    return "Possui memoria organizacional registrada.";
  }

  if (greenFlags.length) {
    return `${greenFlags.length} Check Points ativos.`;
  }

  return "Sem ativo comercial recente registrado.";
}

function buildExecutiveBriefingRiskLine({
  latestMovement,
  nextPendingTask,
  timelineEvents,
}: {
  latestMovement: CrmStructuredNote | null | undefined;
  nextPendingTask: CrmTask | null;
  timelineEvents: CrmOperationalTimelineEvent[];
}) {
  if (!nextPendingTask) {
    return "Nao possui proxima acao definida.";
  }

  if (resolveCrmTaskTemporalStatus(nextPendingTask) === "overdue") {
    return "Proxima acao esta vencida.";
  }

  if (!latestMovement && !timelineEvents.length) {
    return "Pouca atividade operacional registrada.";
  }

  return "Possui proxima acao definida.";
}

function buildExecutiveBriefingGapLine({
  knowledgeItems,
  leadSimulations,
  latestMovement,
  strategicProfile,
}: {
  knowledgeItems: CrmLeadKnowledgeItem[];
  leadSimulations: CrmLeadSimulation[];
  latestMovement: CrmStructuredNote | null | undefined;
  strategicProfile: CrmLeadProfile | null;
}) {
  if (!knowledgeItems.length) {
    return "Ainda nao ha memoria organizacional registrada.";
  }

  if (!hasStrategicProfileContent(strategicProfile)) {
    return "Perfil estrategico ainda incompleto.";
  }

  if (!leadSimulations.length) {
    return "Ainda nao ha simulacao salva.";
  }

  if (!latestMovement) {
    return "Ultima atividade nao esta clara.";
  }

  return "Memoria, perfil e simulacoes registrados.";
}

function buildExecutiveBriefingPriorityLine({
  knowledgeItems,
  latestMovement,
  nextPendingTask,
}: {
  knowledgeItems: CrmLeadKnowledgeItem[];
  latestMovement: CrmStructuredNote | null | undefined;
  nextPendingTask: CrmTask | null;
}) {
  if (nextPendingTask) {
    return `Executar: ${compactExecutiveBriefingText(nextPendingTask.title)}.`;
  }

  if (latestMovement) {
    return "Proximo passo a partir da ultima atividade.";
  }

  if (!knowledgeItems.length) {
    return "Contexto estrategico minimo ainda nao registrado.";
  }

  return "Proximo movimento comercial ainda nao registrado.";
}

function hasStrategicProfileContent(profile: CrmLeadProfile | null) {
  return Boolean(
    profile &&
      (profile.primaryGoal ||
        profile.currentMoment ||
        profile.strategicNotes ||
        profile.strategicTopics.length),
  );
}

function compactExecutiveBriefingText(value: string) {
  const normalized = value.trim().replace(/\s+/g, " ");

  if (normalized.length <= 72) {
    return normalized;
  }

  return `${normalized.slice(0, 69).trimEnd()}...`;
}
