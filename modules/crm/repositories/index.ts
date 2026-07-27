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
import { CrmRepositoryError } from "./crm-repository";

type SupabaseTechnicalError = {
  code?: string;
  details?: string | null;
  hint?: string | null;
  message?: string;
};

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
      logCrmLeadCreationError("authenticated", error);

      if (shouldUseSupabaseAuth) {
        throw mapCrmLeadCreationError(error);
      }
    }
  }

  try {
    console.info("[EVOLV CRM] Create usando Supabase anon.", { id: lead.id });
    const createdLead = await createSupabaseCrmRepository().createLead(lead);

    setCrmRepositorySource("anon");
    return createdLead;
  } catch (error) {
    logCrmLeadCreationError("anon", error);
    throw mapCrmLeadCreationError(error);
  }
}

function mapCrmLeadCreationError(error: unknown) {
  if (error instanceof CrmRepositoryError) {
    const messageByCode: Record<CrmRepositoryError["code"], string> = {
      CRM_PROFILE_INACTIVE:
        "Seu perfil de acesso ao CRM esta inativo. Entre em contato com o administrador.",
      CRM_PROFILE_NOT_FOUND:
        "Seu perfil de acesso ao CRM nao foi encontrado. Entre em contato com o administrador.",
      CRM_PROFILE_ORGANIZATION_MISSING:
        "Seu perfil nao esta vinculado a uma organizacao. Entre em contato com o administrador.",
    };

    return new Error(messageByCode[error.code], { cause: error });
  }

  const technicalError = readSupabaseTechnicalError(error);
  const normalizedMessage = technicalError.message?.toLowerCase() ?? "";

  if (
    technicalError.code === "42501" ||
    normalizedMessage.includes("row-level security")
  ) {
    return new Error(
      "Voce nao tem permissao para criar leads nesta organizacao.",
      { cause: error },
    );
  }

  if (technicalError.code === "23502") {
    return new Error(
      "Um campo obrigatorio do lead nao foi preenchido. Revise o formulario.",
      { cause: error },
    );
  }

  if (
    technicalError.code === "22P02" ||
    technicalError.code === "22007" ||
    technicalError.code === "22008" ||
    technicalError.code === "23514" ||
    technicalError.code === "PGRST102"
  ) {
    return new Error(
      "Um ou mais campos do lead possuem valores invalidos. Revise o formulario.",
      { cause: error },
    );
  }

  if (technicalError.code === "23503") {
    return new Error(
      "O lead referencia um perfil ou organizacao invalida. Atualize a pagina e tente novamente.",
      { cause: error },
    );
  }

  if (technicalError.code === "PGRST204") {
    return new Error(
      "O cadastro de leads esta temporariamente indisponivel por uma incompatibilidade de dados.",
      { cause: error },
    );
  }

  return new Error(
    "Nao foi possivel criar o lead. Tente novamente ou contate o suporte.",
    { cause: error },
  );
}

function logCrmLeadCreationError(
  source: "anon" | "authenticated",
  error: unknown,
) {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  const technicalError = readSupabaseTechnicalError(error);

  console.error("[EVOLV CRM] Falha tecnica ao criar lead.", {
    code: technicalError.code ?? null,
    details: technicalError.details ?? null,
    hint: technicalError.hint ?? null,
    message:
      technicalError.message ??
      (error instanceof Error ? error.message : "Unknown CRM creation error."),
    source,
  });
}

function readSupabaseTechnicalError(
  error: unknown,
): SupabaseTechnicalError {
  if (!error || typeof error !== "object") {
    return {};
  }

  const candidate = error as SupabaseTechnicalError;

  return {
    code: typeof candidate.code === "string" ? candidate.code : undefined,
    details:
      typeof candidate.details === "string" || candidate.details === null
        ? candidate.details
        : undefined,
    hint:
      typeof candidate.hint === "string" || candidate.hint === null
        ? candidate.hint
        : undefined,
    message:
      typeof candidate.message === "string" ? candidate.message : undefined,
  };
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
