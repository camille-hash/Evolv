import { crmStageLabels } from "./crm-engine";
import type { CrmLeadSimulation } from "./crm-lead-simulations";
import type { CrmLeadGreenFlag } from "./crm-green-flags";
import {
  resolveCrmTaskTemporalStatus,
  resolveNextPendingCrmTask,
  type CrmTask,
} from "./crm-tasks";
import type { CrmLead, CrmTemperature } from "./crm-types";

export type CrmExecutiveDistributionItem = {
  count: number;
  key: string;
  label: string;
};

export type CrmExecutiveDashboardReadModel = {
  activity: {
    recentlyUpdated: number;
    withoutRecentUpdate: number;
  };
  checkpoints: {
    leadsWithCheckpoints: number;
    leadsWithoutCheckpoints: number;
    totalCheckpoints: number;
  };
  leads: {
    hot: number;
    hotPercentage: number;
    total: number;
  };
  simulations: {
    leadsSimulated: number;
    leadsWithMultiCotas: number;
    totalSimulations: number;
  };
  stages: CrmExecutiveDistributionItem[];
  tasks: {
    leadsWithOverdueAction: number;
    leadsWithoutPendingAction: number;
  };
  temperatures: CrmExecutiveDistributionItem[];
};

type CrmExecutiveDashboardInput = {
  checkpointsByLeadId: Record<string, CrmLeadGreenFlag[]>;
  leads: CrmLead[];
  now?: Date;
  pendingTasksByLeadId: Record<string, CrmTask[]>;
  simulationsByLeadId: Record<string, CrmLeadSimulation[]>;
};

const temperatureOrder: CrmTemperature[] = ["fria", "morna", "quente"];
const temperatureLabels: Record<CrmTemperature, string> = {
  fria: "Fria",
  morna: "Morna",
  quente: "Quente",
};

export function buildCrmExecutiveDashboardReadModel({
  checkpointsByLeadId,
  leads,
  now = new Date(),
  pendingTasksByLeadId,
  simulationsByLeadId,
}: CrmExecutiveDashboardInput): CrmExecutiveDashboardReadModel {
  const leadIds = new Set(leads.map((lead) => lead.id));
  const hotLeads = leads.filter((lead) => lead.temperatura === "quente").length;
  const leadsWithOverdueAction = leads.filter((lead) => {
    const nextTask = resolveNextPendingCrmTask(
      pendingTasksByLeadId[lead.id] ?? [],
    );

    return (
      nextTask !== null &&
      resolveCrmTaskTemporalStatus(nextTask, now) === "overdue"
    );
  }).length;
  const leadsWithoutPendingAction = leads.filter(
    (lead) =>
      resolveNextPendingCrmTask(pendingTasksByLeadId[lead.id] ?? []) === null,
  ).length;
  const checkpointCollections = Object.entries(checkpointsByLeadId)
    .filter(([leadId]) => leadIds.has(leadId))
    .map(([, checkpoints]) => checkpoints);
  const leadsWithCheckpoints = checkpointCollections.filter(
    (checkpoints) => checkpoints.length > 0,
  ).length;
  const simulationCollections = leads.map(
    (lead) => simulationsByLeadId[lead.id] ?? [],
  );
  const recentlyUpdated = leads.filter((lead) =>
    isWithinLastDays(lead.updatedAt, now, 30),
  ).length;

  return {
    activity: {
      recentlyUpdated,
      withoutRecentUpdate: leads.length - recentlyUpdated,
    },
    checkpoints: {
      leadsWithCheckpoints,
      leadsWithoutCheckpoints: leads.length - leadsWithCheckpoints,
      totalCheckpoints: checkpointCollections.reduce(
        (total, checkpoints) => total + checkpoints.length,
        0,
      ),
    },
    leads: {
      hot: hotLeads,
      hotPercentage: leads.length > 0 ? hotLeads / leads.length : 0,
      total: leads.length,
    },
    simulations: {
      leadsSimulated: simulationCollections.filter(
        (simulations) => simulations.length > 0,
      ).length,
      leadsWithMultiCotas: simulationCollections.filter((simulations) =>
        simulations.some(
          (simulation) => simulation.simulationType === "multi_cotas",
        ),
      ).length,
      totalSimulations: simulationCollections.reduce(
        (total, simulations) => total + simulations.length,
        0,
      ),
    },
    stages: buildStageDistribution(leads),
    tasks: {
      leadsWithOverdueAction,
      leadsWithoutPendingAction,
    },
    temperatures: temperatureOrder.map((temperature) => ({
      count: leads.filter((lead) => lead.temperatura === temperature).length,
      key: temperature,
      label: temperatureLabels[temperature],
    })),
  };
}

function buildStageDistribution(leads: CrmLead[]) {
  const counts = leads.reduce<Map<string, number>>((distribution, lead) => {
    distribution.set(lead.etapa, (distribution.get(lead.etapa) ?? 0) + 1);
    return distribution;
  }, new Map());

  return Array.from(counts.entries())
    .map(([stage, count]) => ({
      count,
      key: stage,
      label: crmStageLabels[stage] ?? stage,
    }))
    .sort(
      (first, second) =>
        second.count - first.count || first.label.localeCompare(second.label),
    );
}

function isWithinLastDays(value: string, now: Date, days: number) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  const todayStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
  const dateStart = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );
  const ageInDays = Math.floor(
    (todayStart.getTime() - dateStart.getTime()) / (24 * 60 * 60 * 1000),
  );

  return ageInDays >= 0 && ageInDays <= days;
}
