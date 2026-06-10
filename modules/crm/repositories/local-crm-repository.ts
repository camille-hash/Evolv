import { loadCrmLeads } from "../crm-storage";
import type { CrmLead } from "../crm-types";
import type { CrmRepository } from "./crm-repository";

export class LocalCrmRepository implements CrmRepository {
  async list(): Promise<CrmLead[]> {
    return loadCrmLeads();
  }

  async getById(id: string): Promise<CrmLead | null> {
    return loadCrmLeads().find((lead) => lead.id === id) ?? null;
  }
}
