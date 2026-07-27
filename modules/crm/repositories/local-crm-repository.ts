import { loadCrmLeads, saveCrmLeads } from "../crm-storage";
import type { CrmLead } from "../crm-types";
import type { CrmRepository } from "./crm-repository";

export class LocalCrmRepository implements CrmRepository {
  async createLead(lead: CrmLead): Promise<CrmLead> {
    const leads = loadCrmLeads();
    const existingLead = leads.find((item) => item.id === lead.id);

    if (existingLead) {
      return existingLead;
    }

    saveCrmLeads([lead, ...leads]);

    return lead;
  }

  async list(): Promise<CrmLead[]> {
    return loadCrmLeads();
  }

  async getById(id: string): Promise<CrmLead | null> {
    return loadCrmLeads().find((lead) => lead.id === id) ?? null;
  }

  async updateLead(
    id: string,
    patch: Partial<CrmLead>,
  ): Promise<CrmLead | null> {
    const leads = loadCrmLeads();
    const existingLead = leads.find((lead) => lead.id === id);
    const updatedAt = new Date().toISOString();

    let nextLead: CrmLead;

    if (existingLead) {
      nextLead = { ...existingLead, ...patch, id, updatedAt };
    } else if (isCompleteLeadPatch(id, patch)) {
      nextLead = { ...patch, id, updatedAt };
    } else {
      return null;
    }

    const nextLeads = existingLead
      ? leads.map((lead) => (lead.id === id ? nextLead : lead))
      : [nextLead, ...leads];

    saveCrmLeads(nextLeads);

    return nextLead;
  }
}

function isCompleteLeadPatch(
  id: string,
  patch: Partial<CrmLead>,
): patch is CrmLead {
  return (
    patch.id === id &&
    typeof patch.nome === "string" &&
    typeof patch.telefone === "string" &&
    typeof patch.email === "string" &&
    typeof patch.origem === "string" &&
    typeof patch.consultor === "string" &&
    typeof patch.valorPretendido === "number" &&
    typeof patch.observacoes === "string" &&
    typeof patch.pipeline === "string" &&
    typeof patch.etapa === "string" &&
    Array.isArray(patch.tags) &&
    typeof patch.produtoInteresse === "string" &&
    typeof patch.temperatura === "string" &&
    typeof patch.status === "string" &&
    typeof patch.proximaAcao === "string" &&
    typeof patch.dataProximaAcao === "string" &&
    typeof patch.createdAt === "string" &&
    typeof patch.updatedAt === "string"
  );
}
