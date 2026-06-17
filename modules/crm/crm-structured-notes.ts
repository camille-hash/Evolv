import {
  crmPipelineLabels,
  crmStageLabels,
} from "./crm-engine";
import type { CrmLead } from "./crm-types";

export type CrmStructuredNoteKind =
  | "strategic-context"
  | "latest-movement"
  | "history";

export type CrmStructuredNote = {
  author: string;
  content: string;
  id: string;
  kind: CrmStructuredNoteKind;
  timestamp: string;
};

export type CrmStructuredNoteGroups = {
  history: CrmStructuredNote[];
  latestMovements: CrmStructuredNote[];
  strategicContext: CrmStructuredNote[];
};

export function buildTemporaryStructuredNotesFromLead(
  lead: CrmLead,
): CrmStructuredNoteGroups {
  const author = lead.consultor || "EVOLV";
  const pipelineLabel = resolvePipelineLabel(lead.pipeline);
  const stageLabel = resolveStageLabel(lead.etapa);
  const strategicContext = lead.observacoes.trim()
    ? [
        {
          author,
          content: lead.observacoes,
          id: `strategic-context-${lead.id}`,
          kind: "strategic-context" as const,
          timestamp: lead.updatedAt,
        },
      ]
    : [];

  const latestMovements: CrmStructuredNote[] = [
    {
      author: "EVOLV",
      content: `Lead esta em ${pipelineLabel} / ${stageLabel}.`,
      id: `current-stage-${lead.id}`,
      kind: "latest-movement",
      timestamp: lead.updatedAt,
    },
    {
      author: "EVOLV",
      content: lead.proximaAcao
        ? `Proxima acao registrada: ${lead.proximaAcao}.`
        : "Sem proxima acao definida.",
      id: `next-action-${lead.id}`,
      kind: "latest-movement",
      timestamp: lead.updatedAt,
    },
    {
      author: "EVOLV",
      content: "Lead criado no CRM.",
      id: `lead-created-${lead.id}`,
      kind: "latest-movement",
      timestamp: lead.createdAt,
    },
  ];

  return {
    history: [],
    latestMovements,
    strategicContext,
  };
}

function resolvePipelineLabel(pipeline: CrmLead["pipeline"]) {
  const label = crmPipelineLabels[pipeline];

  return typeof label === "string" && label.trim()
    ? label
    : "Funil nao informado";
}

function resolveStageLabel(stage: CrmLead["etapa"]) {
  const label = crmStageLabels[stage];

  return typeof label === "string" && label.trim()
    ? label
    : "Etapa nao informada";
}
