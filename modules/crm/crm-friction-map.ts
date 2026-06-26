import type { CrmLeadKnowledgeItem } from "./crm-lead-knowledge";
import type { CrmLeadSimulation } from "./crm-lead-simulations";
import type { CrmStructuredNote } from "./crm-structured-notes";
import type { CrmTask } from "./crm-tasks";
import { resolveCrmTaskTemporalStatus } from "./crm-tasks";

type FrictionMapItem = {
  description: string;
  title: string;
};

export function buildFrictionMap({
  knowledgeItems,
  leadSimulations,
  latestMovement,
  nextPendingTask,
}: {
  knowledgeItems: CrmLeadKnowledgeItem[];
  leadSimulations: CrmLeadSimulation[];
  latestMovement: CrmStructuredNote | null | undefined;
  nextPendingTask: CrmTask | null;
}): FrictionMapItem[] {
  const frictions: FrictionMapItem[] = [];

  if (!nextPendingTask) {
    frictions.push({
      description: "O relacionamento nao possui uma acao pendente definida.",
      title: "Sem proxima acao",
    });
  }

  if (
    nextPendingTask &&
    resolveCrmTaskTemporalStatus(nextPendingTask) === "overdue"
  ) {
    frictions.push({
      description: "A proxima acao pendente ja passou do prazo.",
      title: "Proxima acao vencida",
    });
  }

  if (!knowledgeItems.length) {
    frictions.push({
      description: "Nao ha conhecimento estruturado registrado para este lead.",
      title: "Nenhum Knowledge registrado",
    });
  }

  if (!leadSimulations.length) {
    frictions.push({
      description: "Ainda nao existe simulacao salva neste relacionamento.",
      title: "Nenhuma simulacao",
    });
  }

  if (!latestMovement) {
    frictions.push({
      description: "Nao ha movimentacao recente disponivel no Dossie.",
      title: "Sem movimentacao recente",
    });
  }

  return frictions.slice(0, 3);
}
