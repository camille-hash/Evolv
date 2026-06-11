export * from "./crm-repository";
export * from "./local-crm-repository";
export * from "./supabase-crm-repository";

import type { CrmLead } from "../crm-types";
import { LocalCrmRepository } from "./local-crm-repository";
import {
  canUseSupabaseCrmRepository,
  createSupabaseCrmRepository,
} from "./supabase-crm-repository";

const localCrmRepository = new LocalCrmRepository();

export async function listCrmLeadsFromRepository(): Promise<CrmLead[]> {
  if (!canUseSupabaseCrmRepository()) {
    return localCrmRepository.list();
  }

  try {
    return await createSupabaseCrmRepository().list();
  } catch (error) {
    console.warn(
      "Falha ao ler CRM no Supabase. Usando fallback localStorage.",
      error,
    );

    return localCrmRepository.list();
  }
}

export async function getCrmLeadByIdFromRepository(
  id: string,
): Promise<CrmLead | null> {
  if (!canUseSupabaseCrmRepository()) {
    return localCrmRepository.getById(id);
  }

  try {
    return await createSupabaseCrmRepository().getById(id);
  } catch (error) {
    console.warn(
      "Falha ao buscar lead no Supabase. Usando fallback localStorage.",
      error,
    );

    return localCrmRepository.getById(id);
  }
}

export async function updateCrmLeadInRepository(
  id: string,
  patch: Partial<CrmLead>,
): Promise<CrmLead | null> {
  if (!canUseSupabaseCrmRepository()) {
    return localCrmRepository.updateLead(id, patch);
  }

  try {
    return await createSupabaseCrmRepository().updateLead(id, patch);
  } catch (error) {
    console.warn(
      "Falha ao atualizar lead no Supabase. Verifique se existe policy de update em public.crm_leads. Usando fallback localStorage.",
      error,
    );

    return localCrmRepository.updateLead(id, patch);
  }
}
