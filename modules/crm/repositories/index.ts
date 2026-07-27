export * from "./crm-repository";
export * from "./authenticated-supabase-crm-repository";
export * from "./crm-lead-notes-repository";
export * from "./local-crm-repository";
export * from "./supabase-crm-repository";

import { createCrmLead } from "../crm-engine";
import type { CrmLead, CrmLeadInput } from "../crm-types";
import { setCrmRepositorySource } from "../crm-source-observability";
import {
  canCreateAuthenticatedSupabaseCrmRepository,
  createAuthenticatedSupabaseCrmRepository,
} from "./authenticated-supabase-crm-repository";
import { LocalCrmRepository } from "./local-crm-repository";
import {
  canUseSupabaseCrmRepository,
  createSupabaseCrmRepository,
} from "./supabase-crm-repository";

const localCrmRepository = new LocalCrmRepository();
const shouldUseAuthenticatedCrmShadow =
  process.env.NEXT_PUBLIC_USE_SUPABASE_CRM_AUTH_SHADOW === "true";
const shouldUseSupabaseAuth =
  process.env.NEXT_PUBLIC_USE_SUPABASE_AUTH === "true";

export async function createCrmLeadInRepository(
  input: CrmLeadInput,
  idempotencyKey?: string,
): Promise<CrmLead> {
  const lead = {
    ...createCrmLead(input),
    id: idempotencyKey ?? crypto.randomUUID(),
  };

  if (!canUseSupabaseCrmRepository()) {
    console.info("[EVOLV CRM] Create usando localStorage.", { id: lead.id });
    setCrmRepositorySource("localStorage");
    return localCrmRepository.createLead(lead);
  }

  if (canCreateAuthenticatedSupabaseCrmRepository()) {
    try {
      console.info("[EVOLV CRM] Create usando Supabase authenticated.", {
        id: lead.id,
      });
      const createdLead =
        await createAuthenticatedSupabaseCrmRepository().createLead(lead);

      setCrmRepositorySource("authenticated");
      return createdLead;
    } catch (error) {
      console.warn("[EVOLV CRM] Create authenticated falhou.", error);

      if (shouldUseSupabaseAuth) {
        throw new Error(
          "Nao foi possivel criar o lead. Verifique sua conexao e tente novamente.",
          { cause: error },
        );
      }
    }
  }

  try {
    console.info("[EVOLV CRM] Create usando Supabase anon.", { id: lead.id });
    const createdLead = await createSupabaseCrmRepository().createLead(lead);

    setCrmRepositorySource("anon");
    return createdLead;
  } catch (error) {
    console.error("[EVOLV CRM] Nao foi possivel persistir o novo lead.", error);
    throw new Error(
      "Nao foi possivel criar o lead. Verifique sua conexao e tente novamente.",
      { cause: error },
    );
  }
}

export async function listCrmLeadsFromRepository(): Promise<CrmLead[]> {
  if (!canUseSupabaseCrmRepository()) {
    console.info("[EVOLV CRM] Fonte ativa: localStorage.");
    setCrmRepositorySource("localStorage");
    return localCrmRepository.list();
  }

  const isAuthenticatedShadowEnabled = canUseAuthenticatedCrmShadowRepository();

  if (isAuthenticatedShadowEnabled) {
    try {
      console.info("[EVOLV CRM] Fonte ativa: Supabase authenticated shadow.");
      const leads = await createAuthenticatedSupabaseCrmRepository().list();

      setCrmRepositorySource("authenticated");

      return leads;
    } catch (error) {
      console.warn(
        "[EVOLV CRM] Authenticated shadow falhou. Usando fallback Supabase anon.",
        error,
      );
    }
  }

  try {
    console.info(
      isAuthenticatedShadowEnabled
        ? "[EVOLV CRM] Fonte ativa: Supabase anon."
        : "[EVOLV CRM] Fonte ativa: Supabase.",
    );
    const leads = await createSupabaseCrmRepository().list();

    setCrmRepositorySource("anon");

    return leads;
  } catch (error) {
    console.warn(
      isAuthenticatedShadowEnabled
        ? "Falha ao ler CRM no Supabase anon. Usando fallback localStorage."
        : "Falha ao ler CRM no Supabase. Usando fallback localStorage.",
      error,
    );

    setCrmRepositorySource("localStorage");

    return localCrmRepository.list();
  }
}

export async function getCrmLeadByIdFromRepository(
  id: string,
): Promise<CrmLead | null> {
  if (!canUseSupabaseCrmRepository()) {
    console.info("[EVOLV CRM] Busca de lead usando localStorage.", { id });
    setCrmRepositorySource("localStorage");
    return localCrmRepository.getById(id);
  }

  const isAuthenticatedShadowEnabled = canUseAuthenticatedCrmShadowRepository();

  if (isAuthenticatedShadowEnabled) {
    try {
      console.info("[EVOLV CRM] Busca de lead usando Supabase authenticated shadow.", {
        id,
      });
      const lead = await createAuthenticatedSupabaseCrmRepository().getById(id);

      setCrmRepositorySource("authenticated");

      return lead;
    } catch (error) {
      console.warn(
        "[EVOLV CRM] Busca authenticated shadow falhou. Usando fallback Supabase anon.",
        error,
      );
    }
  }

  try {
    console.info(
      isAuthenticatedShadowEnabled
        ? "[EVOLV CRM] Busca de lead usando Supabase anon."
        : "[EVOLV CRM] Busca de lead usando Supabase.",
      { id },
    );
    const lead = await createSupabaseCrmRepository().getById(id);

    setCrmRepositorySource("anon");

    return lead;
  } catch (error) {
    console.warn(
      isAuthenticatedShadowEnabled
        ? "Falha ao buscar lead no Supabase anon. Usando fallback localStorage."
        : "Falha ao buscar lead no Supabase. Usando fallback localStorage.",
      error,
    );

    setCrmRepositorySource("localStorage");

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
    setCrmRepositorySource("localStorage");
    return localCrmRepository.updateLead(id, patch);
  }

  const isAuthenticatedShadowEnabled = canUseAuthenticatedCrmShadowRepository();

  if (isAuthenticatedShadowEnabled) {
    try {
      console.info("[EVOLV CRM] Update usando Supabase authenticated shadow.", {
        fields,
        id,
      });

      const authenticatedUpdatedLead =
        await createAuthenticatedSupabaseCrmRepository().updateLead(id, patch);

      if (authenticatedUpdatedLead) {
        setCrmRepositorySource("authenticated");
        return authenticatedUpdatedLead;
      }

      console.warn(
        "[EVOLV CRM] Authenticated shadow nao retornou lead atualizado. Usando fallback Supabase anon.",
        { externalId: patch.externalId, id },
      );
    } catch (error) {
      console.warn(
        "[EVOLV CRM] Update authenticated shadow falhou. Usando fallback Supabase anon.",
        error,
      );
    }
  }

  try {
    console.info(
      isAuthenticatedShadowEnabled
        ? "[EVOLV CRM] Update usando Supabase anon."
        : "[EVOLV CRM] Update usando Supabase.",
      { fields, id },
    );

    const updatedLead = await createSupabaseCrmRepository().updateLead(id, patch);

    if (updatedLead) {
      setCrmRepositorySource("anon");
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

  setCrmRepositorySource("localStorage");

  return localCrmRepository.updateLead(id, patch);
}

function canUseAuthenticatedCrmShadowRepository() {
  return (
    shouldUseAuthenticatedCrmShadow &&
    canUseSupabaseCrmRepository() &&
    canCreateAuthenticatedSupabaseCrmRepository()
  );
}
