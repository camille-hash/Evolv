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
    console.info("[EVOLV CRM] Fonte ativa: localStorage.");
    return localCrmRepository.list();
  }

  try {
    console.info("[EVOLV CRM] Fonte ativa: Supabase.");
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
    console.info("[EVOLV CRM] Busca de lead usando localStorage.", { id });
    return localCrmRepository.getById(id);
  }

  try {
    console.info("[EVOLV CRM] Busca de lead usando Supabase.", { id });
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
  const fields = Object.keys(patch);

  if (!canUseSupabaseCrmRepository()) {
    console.info("[EVOLV CRM] Update usando localStorage.", { fields, id });
    return localCrmRepository.updateLead(id, patch);
  }

  try {
    console.info("[EVOLV CRM] Update usando Supabase.", { fields, id });

    const updatedLead = await createSupabaseCrmRepository().updateLead(id, patch);

    if (updatedLead) {
      return updatedLead;
    }

    console.warn(
      "Supabase nao retornou lead atualizado. Verifique se o id/external_id existe e se a policy de update permite a operacao. Usando fallback localStorage.",
      { externalId: patch.externalId, id },
    );
  } catch (error) {
    console.warn(
      "Falha ao atualizar lead no Supabase. Verifique se existe policy de update em public.crm_leads. Usando fallback localStorage.",
      error,
    );
  }

  return localCrmRepository.updateLead(id, patch);
}
