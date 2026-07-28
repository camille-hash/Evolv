import type { CrmLeadGreenFlag } from "./crm-green-flags";
import type { CrmTask } from "./crm-tasks";
import type { AssemblyOpportunity } from "./assembly-opportunities";

export type CrmMyDayView = {
  assemblyOpportunities: AssemblyOpportunity[];
  greenFlagsByLeadId: Record<string, CrmLeadGreenFlag[]>;
  operationalHistoryByLeadId: Record<string, CrmLeadOperationalHistory>;
  pendingTasksByLeadId: Record<string, CrmTask[]>;
  tasks: CrmTask[];
};

export type CrmLeadOperationalHistory = {
  hasMultiCotas: boolean;
  lastInteractionAt: string | null;
  lastSimulationAt: string | null;
};
