import {
  createCrmLead,
  moveCrmLead,
  normalizeCrmLead,
  updateCrmLead,
} from "./crm-engine";
import type {
  CrmLead,
  CrmLeadInput,
  CrmPipeline,
  CrmPipelineDefinition,
  CrmStage,
} from "./crm-types";

const CRM_STORAGE_KEY = "evolv.crm.v1";

export function loadCrmLeads(): CrmLead[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(CRM_STORAGE_KEY);

    if (!rawValue) {
      return [];
    }

    const parsedValue = JSON.parse(rawValue);

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue
      .map(normalizeCrmLead)
      .filter((lead): lead is CrmLead => Boolean(lead))
      .sort(sortByUpdatedAtDesc);
  } catch {
    return [];
  }
}

export function saveCrmLeads(leads: CrmLead[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    CRM_STORAGE_KEY,
    JSON.stringify([...leads].sort(sortByUpdatedAtDesc)),
  );
}

export function saveCrmLead(input: CrmLeadInput, leadId?: string): CrmLead[] {
  const leads = loadCrmLeads();
  const existingLead = leadId
    ? leads.find((lead) => lead.id === leadId)
    : undefined;
  const nextLead = existingLead
    ? updateCrmLead(existingLead, input)
    : createCrmLead(input);
  const nextLeads = existingLead
    ? leads.map((lead) => (lead.id === existingLead.id ? nextLead : lead))
    : [nextLead, ...leads];

  saveCrmLeads(nextLeads);

  return loadCrmLeads();
}

export function deleteCrmLead(leadId: string): CrmLead[] {
  const nextLeads = loadCrmLeads().filter((lead) => lead.id !== leadId);

  saveCrmLeads(nextLeads);

  return loadCrmLeads();
}

export function updateCrmLeadStage(
  leadId: string,
  pipeline: CrmPipeline,
  stage?: CrmStage,
  pipelineDefinitions?: CrmPipelineDefinition[],
): CrmLead[] {
  const nextLeads = loadCrmLeads().map((lead) =>
    lead.id === leadId
      ? moveCrmLead(lead, pipeline, stage, pipelineDefinitions)
      : lead,
  );

  saveCrmLeads(nextLeads);

  return loadCrmLeads();
}

function sortByUpdatedAtDesc(left: CrmLead, right: CrmLead) {
  return (
    new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
  );
}
