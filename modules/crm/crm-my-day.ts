import type { CrmLeadGreenFlag } from "./crm-green-flags";
import type { CrmTask } from "./crm-tasks";

export type CrmMyDayView = {
  greenFlagsByLeadId: Record<string, CrmLeadGreenFlag[]>;
  operationalHistoryByLeadId: Record<string, CrmLeadOperationalHistory>;
  tasks: CrmTask[];
};

export type CrmLeadOperationalHistory = {
  hasMultiCotas: boolean;
  lastInteractionAt: string | null;
  lastSimulationAt: string | null;
};
