import type {
  CrmActivity,
  CrmLead,
  CrmOpportunityStatus,
  CrmPipeline,
  CrmPipelineDefinition,
  CrmTemperature,
} from "./crm-types";

const CRM_GOAL_STORAGE_KEY = "evolv.crm.goal.v1";

export type CrmOriginRankingItem = {
  origin: "Facebook" | "Indicacao" | "Instagram" | "Google" | "Outros";
  count: number;
};

export type CrmNextAction = {
  leadId: string;
  leadName: string;
  action: string;
  date: string;
};

export type CrmSalesDashboard = {
  monthlyGoal: number;
  activeLeadsCount: number;
  wonOpportunitiesCount: number;
  lostOpportunitiesCount: number;
  pendingActivitiesCount: number;
  overdueActionsCount: number;
  activePotentialValue: number;
  wonPotentialValue: number;
  lostPotentialValue: number;
  goalGap: number;
  goalCompletionRate: number;
  opportunitiesByStatus: Record<CrmOpportunityStatus, number>;
  leadsByPipeline: Record<CrmPipeline, number>;
  pipelineSummaries: Array<{ id: CrmPipeline; nome: string; count: number }>;
  leadsByTemperature: Record<CrmTemperature, number>;
  originRanking: CrmOriginRankingItem[];
  nextActions: CrmNextAction[];
  overdueActions: CrmNextAction[];
};

export function loadCrmMonthlyGoal(): number {
  if (typeof window === "undefined") {
    return 0;
  }

  try {
    const rawValue = window.localStorage.getItem(CRM_GOAL_STORAGE_KEY);

    if (!rawValue) {
      return 0;
    }

    const parsedValue = JSON.parse(rawValue);
    const goal =
      typeof parsedValue === "number"
        ? parsedValue
        : Number(parsedValue?.monthlyGoal ?? 0);

    return Number.isFinite(goal) ? Math.max(goal, 0) : 0;
  } catch {
    return 0;
  }
}

export function saveCrmMonthlyGoal(monthlyGoal: number): number {
  const normalizedGoal = Number.isFinite(monthlyGoal)
    ? Math.max(monthlyGoal, 0)
    : 0;

  if (typeof window !== "undefined") {
    window.localStorage.setItem(
      CRM_GOAL_STORAGE_KEY,
      JSON.stringify({ monthlyGoal: normalizedGoal }),
    );
  }

  return normalizedGoal;
}

export function buildCrmSalesDashboard({
  activities,
  leads,
  monthlyGoal,
  pipelineDefinitions = [],
}: {
  activities: CrmActivity[];
  leads: CrmLead[];
  monthlyGoal: number;
  pipelineDefinitions?: CrmPipelineDefinition[];
}): CrmSalesDashboard {
  const activeLeads = leads.filter((lead) => lead.status === "ativa");
  const wonLeads = leads.filter((lead) => lead.status === "ganha");
  const lostLeads = leads.filter((lead) => lead.status === "perdida");
  const activePotentialValue = activeLeads.reduce(
    (total, lead) => total + lead.valorPretendido,
    0,
  );
  const wonPotentialValue = wonLeads.reduce(
    (total, lead) => total + lead.valorPretendido,
    0,
  );
  const lostPotentialValue = lostLeads.reduce(
    (total, lead) => total + lead.valorPretendido,
    0,
  );
  const pendingActivitiesCount = activities.filter(
    (activity) => activity.status === "pending",
  ).length;
  const nextActions = buildNextActions(activeLeads);
  const overdueActions = nextActions.filter((action) =>
    isDateBeforeToday(action.date),
  );
  const goalGap = Math.max(monthlyGoal - activePotentialValue, 0);
  const goalCompletionRate =
    monthlyGoal > 0 ? activePotentialValue / monthlyGoal : 0;

  return {
    monthlyGoal,
    activeLeadsCount: activeLeads.length,
    wonOpportunitiesCount: wonLeads.length,
    lostOpportunitiesCount: lostLeads.length,
    pendingActivitiesCount,
    overdueActionsCount: overdueActions.length,
    activePotentialValue,
    wonPotentialValue,
    lostPotentialValue,
    goalGap,
    goalCompletionRate,
    opportunitiesByStatus: countLeadsByStatus(leads),
    leadsByPipeline: countLeadsByPipeline(leads),
    pipelineSummaries: countLeadsByPipelineDefinitions({
      leads,
      pipelineDefinitions,
    }),
    leadsByTemperature: countLeadsByTemperature(leads),
    originRanking: buildOriginRanking(leads),
    nextActions,
    overdueActions,
  };
}

function countLeadsByPipelineDefinitions({
  leads,
  pipelineDefinitions,
}: {
  leads: CrmLead[];
  pipelineDefinitions: CrmPipelineDefinition[];
}) {
  const configuredSummaries = pipelineDefinitions.map((pipeline) => ({
    id: pipeline.key,
    nome: pipeline.label,
    count: leads.filter((lead) => lead.pipeline === pipeline.key).length,
  }));
  const configuredIds = new Set(pipelineDefinitions.map((pipeline) => pipeline.key));
  const unknownSummaries = Array.from(
    new Set(
      leads
        .map((lead) => lead.pipeline)
        .filter((pipeline) => !configuredIds.has(pipeline)),
    ),
  ).map((pipeline) => ({
    id: pipeline,
    nome: `${pipeline} (nao configurado)`,
    count: leads.filter((lead) => lead.pipeline === pipeline).length,
  }));

  return [...configuredSummaries, ...unknownSummaries];
}

function countLeadsByStatus(leads: CrmLead[]) {
  return leads.reduce<Record<CrmOpportunityStatus, number>>(
    (summary, lead) => ({
      ...summary,
      [lead.status]: summary[lead.status] + 1,
    }),
    {
      ativa: 0,
      ganha: 0,
      perdida: 0,
    },
  );
}

function countLeadsByPipeline(leads: CrmLead[]) {
  return leads.reduce<Record<CrmPipeline, number>>(
    (summary, lead) => ({
      ...summary,
      [lead.pipeline]: summary[lead.pipeline] + 1,
    }),
    {
      prospecting: 0,
      sales: 0,
      administrative: 0,
      lost: 0,
    },
  );
}

function countLeadsByTemperature(leads: CrmLead[]) {
  return leads.reduce<Record<CrmTemperature, number>>(
    (summary, lead) => ({
      ...summary,
      [lead.temperatura]: summary[lead.temperatura] + 1,
    }),
    {
      fria: 0,
      morna: 0,
      quente: 0,
    },
  );
}

function buildOriginRanking(leads: CrmLead[]): CrmOriginRankingItem[] {
  const ranking = leads.reduce<Record<CrmOriginRankingItem["origin"], number>>(
    (summary, lead) => {
      const origin = classifyOrigin(lead.origem);

      return {
        ...summary,
        [origin]: summary[origin] + 1,
      };
    },
    {
      Facebook: 0,
      Indicacao: 0,
      Instagram: 0,
      Google: 0,
      Outros: 0,
    },
  );

  return Object.entries(ranking)
    .map(([origin, count]) => ({
      origin: origin as CrmOriginRankingItem["origin"],
      count,
    }))
    .sort((left, right) => right.count - left.count);
}

function buildNextActions(leads: CrmLead[]): CrmNextAction[] {
  return leads
    .filter((lead) => lead.proximaAcao && lead.dataProximaAcao)
    .map((lead) => ({
      leadId: lead.id,
      leadName: lead.nome,
      action: lead.proximaAcao,
      date: lead.dataProximaAcao,
    }))
    .sort(
      (left, right) =>
        new Date(`${left.date}T00:00:00`).getTime() -
        new Date(`${right.date}T00:00:00`).getTime(),
    );
}

function classifyOrigin(origin: string): CrmOriginRankingItem["origin"] {
  const normalizedOrigin = normalizeText(origin);

  if (normalizedOrigin.includes("facebook")) {
    return "Facebook";
  }

  if (normalizedOrigin.includes("indicacao")) {
    return "Indicacao";
  }

  if (normalizedOrigin.includes("instagram")) {
    return "Instagram";
  }

  if (normalizedOrigin.includes("google")) {
    return "Google";
  }

  return "Outros";
}

function isDateBeforeToday(date: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return new Date(`${date}T00:00:00`).getTime() < today.getTime();
}

function normalizeText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
