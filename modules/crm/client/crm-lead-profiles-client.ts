import type {
  CreateCrmLeadProfileInput,
  CrmLeadProfile,
  UpdateCrmLeadProfileInput,
} from "@/modules/crm";

export async function fetchCrmLeadProfile(
  accessToken: string,
  leadId: string,
) {
  const response = await fetch(
    `/api/crm/lead-profiles?leadId=${encodeURIComponent(leadId)}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  const payload = (await response.json().catch(() => null)) as {
    error?: string;
    profile?: CrmLeadProfile | null;
  } | null;

  if (!response.ok || !("profile" in (payload ?? {}))) {
    throw new Error(
      payload?.error ?? "Nao foi possivel carregar o perfil estrategico.",
    );
  }

  return payload?.profile ?? null;
}

export async function createCrmLeadProfile(
  accessToken: string,
  input: CreateCrmLeadProfileInput,
) {
  const response = await fetch("/api/crm/lead-profiles", {
    body: JSON.stringify(input),
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  const payload = (await response.json().catch(() => null)) as {
    error?: string;
    profile?: CrmLeadProfile;
  } | null;

  if (!response.ok || !payload?.profile) {
    throw new Error(
      payload?.error ?? "Nao foi possivel criar o perfil estrategico.",
    );
  }

  return payload.profile;
}

export async function updateCrmLeadProfile(
  accessToken: string,
  input: UpdateCrmLeadProfileInput,
) {
  const response = await fetch("/api/crm/lead-profiles", {
    body: JSON.stringify(input),
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    method: "PATCH",
  });

  const payload = (await response.json().catch(() => null)) as {
    error?: string;
    profile?: CrmLeadProfile;
  } | null;

  if (!response.ok || !payload?.profile) {
    throw new Error(
      payload?.error ?? "Nao foi possivel atualizar o perfil estrategico.",
    );
  }

  return payload.profile;
}
