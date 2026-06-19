import type { CrmLeadGreenFlag } from "./crm-green-flags";
import type { CrmTask } from "./crm-tasks";

export type CrmMyDayView = {
  greenFlagsByLeadId: Record<string, CrmLeadGreenFlag[]>;
  tasks: CrmTask[];
};
