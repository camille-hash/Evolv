import type { CrmLead } from "../crm-types";

export type CrmRepository = {
  getById(id: string): Promise<CrmLead | null>;
  list(): Promise<CrmLead[]>;
};
