import type { CrmLead } from "../crm-types";

export type CrmRepository = {
  createLead(lead: CrmLead): Promise<CrmLead>;
  getById(id: string): Promise<CrmLead | null>;
  list(): Promise<CrmLead[]>;
  updateLead(id: string, patch: Partial<CrmLead>): Promise<CrmLead | null>;
};
