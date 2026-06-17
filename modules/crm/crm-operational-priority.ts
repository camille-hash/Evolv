import type { CrmLead } from "./crm-types";

export type CrmOperationalPriority =
  | "overdue"
  | "today"
  | "missing_date"
  | "missing_description"
  | "missing_action"
  | "soon"
  | "scheduled"
  | "not_active";

export type CrmOperationalPriorityFilter =
  | "all"
  | "overdue"
  | "today"
  | "missing_action"
  | "incomplete";

export type CrmLeadOperationalPriority = {
  label: string;
  priority: CrmOperationalPriority;
  summary: string;
};

export const crmOperationalPriorityLabels: Record<
  CrmOperationalPriority,
  string
> = {
  missing_action: "Sem proxima acao",
  missing_date: "Acao sem data",
  missing_description: "Data sem acao",
  not_active: "Fora da fila ativa",
  overdue: "Acao vencida",
  scheduled: "Agendado",
  soon: "Acao proxima",
  today: "Acao hoje",
};

export function resolveCrmLeadOperationalPriority(
  lead: Pick<
    CrmLead,
    "dataProximaAcao" | "proximaAcao" | "status"
  >,
  now = new Date(),
): CrmLeadOperationalPriority {
  if (lead.status !== "ativa") {
    return buildPriority(
      "not_active",
      "Oportunidade fora da fila operacional ativa.",
    );
  }

  const hasAction = Boolean(lead.proximaAcao.trim());
  const hasDate = Boolean(lead.dataProximaAcao.trim());

  if (!hasAction && !hasDate) {
    return buildPriority(
      "missing_action",
      "Lead ativo sem proxima acao definida.",
    );
  }

  if (hasAction && !hasDate) {
    return buildPriority(
      "missing_date",
      "Existe acao registrada, mas sem data definida.",
    );
  }

  if (!hasAction && hasDate) {
    return buildPriority(
      "missing_description",
      "Existe data registrada, mas sem descricao da acao.",
    );
  }

  const daysUntilAction = getDaysUntil(lead.dataProximaAcao, now);

  if (daysUntilAction === null) {
    return buildPriority(
      "missing_date",
      "Data da proxima acao nao e confiavel.",
    );
  }

  if (daysUntilAction < 0) {
    return buildPriority("overdue", "Proxima acao esta vencida.");
  }

  if (daysUntilAction === 0) {
    return buildPriority("today", "Proxima acao marcada para hoje.");
  }

  if (daysUntilAction <= 3) {
    return buildPriority(
      "soon",
      `Proxima acao em ${daysUntilAction} ${daysUntilAction === 1 ? "dia" : "dias"}.`,
    );
  }

  return buildPriority(
    "scheduled",
    `Proxima acao em ${daysUntilAction} dias.`,
  );
}

export function buildCrmOperationalPrioritySummary(
  leads: CrmLead[],
  now = new Date(),
) {
  return leads.reduce(
    (summary, lead) => {
      const priority = resolveCrmLeadOperationalPriority(lead, now).priority;

      return {
        missingAction:
          summary.missingAction +
          (priority === "missing_action" ? 1 : 0),
        overdue: summary.overdue + (priority === "overdue" ? 1 : 0),
        today: summary.today + (priority === "today" ? 1 : 0),
      };
    },
    {
      missingAction: 0,
      overdue: 0,
      today: 0,
    },
  );
}

export function matchesCrmOperationalPriorityFilter(
  lead: CrmLead,
  filter: CrmOperationalPriorityFilter,
  now = new Date(),
) {
  if (filter === "all") {
    return true;
  }

  const priority = resolveCrmLeadOperationalPriority(lead, now).priority;

  if (filter === "incomplete") {
    return priority === "missing_date" || priority === "missing_description";
  }

  return priority === filter;
}

function buildPriority(
  priority: CrmOperationalPriority,
  summary: string,
): CrmLeadOperationalPriority {
  return {
    label: crmOperationalPriorityLabels[priority],
    priority,
    summary,
  };
}

function getDaysUntil(value: string, now: Date) {
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match || !Number.isFinite(now.getTime())) {
    return null;
  }

  const [, yearText, monthText, dayText] = match;
  const targetUtc = Date.UTC(
    Number(yearText),
    Number(monthText) - 1,
    Number(dayText),
  );
  const todayUtc = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );

  if (!Number.isFinite(targetUtc)) {
    return null;
  }

  return Math.floor((targetUtc - todayUtc) / 86_400_000);
}
