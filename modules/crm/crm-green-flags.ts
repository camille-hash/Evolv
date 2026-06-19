import type { CrmLeadSimulation } from "./crm-lead-simulations";
import type {
  CrmOperationalTimelineEvent,
  CrmOperationalTimelineEventType,
} from "./crm-timeline";
import type { CrmTask } from "./crm-tasks";

export const crmLeadGreenFlagTypes = [
  "lead_aquecido",
  "interacao_recente",
  "simulacao_recente",
  "multi_cotas_recente",
  "multiplas_simulacoes",
  "multiplos_estudos",
  "sem_tarefa_futura",
  "sem_followup",
  "possui_proposta",
] as const;

export type CrmLeadGreenFlagType = (typeof crmLeadGreenFlagTypes)[number];

export type CrmLeadGreenFlag = {
  description: string;
  type: CrmLeadGreenFlagType;
};

type CrmLeadGreenFlagInput = {
  now?: Date;
  simulations: CrmLeadSimulation[];
  tasks: CrmTask[] | null;
  timelineEvents: CrmOperationalTimelineEvent[];
};

const recentDays = 7;

const interactionTimelineTypes: CrmOperationalTimelineEventType[] = [
  "note_created",
  "task_completed",
];

export function resolveCrmLeadGreenFlags({
  now = new Date(),
  simulations,
  tasks,
  timelineEvents,
}: CrmLeadGreenFlagInput): CrmLeadGreenFlag[] {
  const hasRecentActivity = timelineEvents.some((event) =>
    occurredWithinDays(event.occurredAt, now, recentDays),
  );
  const hasRecentInteraction = timelineEvents.some(
    (event) =>
      interactionTimelineTypes.includes(event.type) &&
      occurredWithinDays(event.occurredAt, now, recentDays),
  );
  const hasActivityHistory = timelineEvents.some((event) =>
    isValidDate(event.occurredAt),
  );
  const commercialSimulations = simulations.filter(
    (simulation) => simulation.simulationType === "commercial",
  );
  const multiCotasStudies = simulations.filter(
    (simulation) => simulation.simulationType === "multi_cotas",
  );
  const hasFutureTask = tasks?.some(
    (task) => task.status === "pending" && isTodayOrFuture(task.dueDate, now),
  );
  const hasPersistedProposal = simulations.some(
    (simulation) =>
      simulation.proposalGeneratedAt !== null ||
      simulation.status === "proposal_generated",
  );

  return compactGreenFlags([
    hasRecentActivity
      ? {
          description: "Lead com atividade recente",
          type: "lead_aquecido",
        }
      : null,
    hasRecentInteraction
      ? {
          description: "Interacao realizada recentemente",
          type: "interacao_recente",
        }
      : null,
    commercialSimulations.some((simulation) =>
      occurredWithinDays(simulation.createdAt, now, recentDays),
    )
      ? {
          description: "Simulacao comercial recente",
          type: "simulacao_recente",
        }
      : null,
    multiCotasStudies.some((simulation) =>
      occurredWithinDays(simulation.createdAt, now, recentDays),
    )
      ? {
          description: "Estudo Multi-Cotas recente",
          type: "multi_cotas_recente",
        }
      : null,
    commercialSimulations.length >= 2
      ? {
          description: "Multiplas simulacoes registradas",
          type: "multiplas_simulacoes",
        }
      : null,
    multiCotasStudies.length >= 2
      ? {
          description: "Multiplos estudos Multi-Cotas registrados",
          type: "multiplos_estudos",
        }
      : null,
    simulations.length > 0 && tasks !== null && !hasFutureTask
      ? {
          description: "Existe simulacao sem proximo passo definido",
          type: "sem_tarefa_futura",
        }
      : null,
    hasActivityHistory && !hasRecentInteraction
      ? {
          description: "Lead pode precisar de retomada de contato",
          type: "sem_followup",
        }
      : null,
    hasPersistedProposal
      ? {
          description: "Proposta comercial registrada",
          type: "possui_proposta",
        }
      : null,
  ]);
}

function compactGreenFlags(
  flags: Array<CrmLeadGreenFlag | null>,
): CrmLeadGreenFlag[] {
  return flags.filter((flag): flag is CrmLeadGreenFlag => flag !== null);
}

function occurredWithinDays(value: string, now: Date, days: number) {
  const occurredAt = new Date(value);

  return (
    !Number.isNaN(occurredAt.getTime()) &&
    occurredAt.getTime() <= now.getTime() &&
    now.getTime() - occurredAt.getTime() <= days * 24 * 60 * 60 * 1000
  );
}

function isTodayOrFuture(dueDate: string, now: Date) {
  const today = formatLocalDate(now);
  return Boolean(dueDate && dueDate >= today);
}

function isValidDate(value: string) {
  return !Number.isNaN(new Date(value).getTime());
}

function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return [year, month, day].join("-");
}
