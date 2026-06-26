import type {
  CreateCrmLeadKnowledgeItemInput,
  CrmLeadKnowledgeItem,
} from "@/modules/crm";

export async function fetchCrmLeadKnowledgeItems(
  accessToken: string,
  leadId: string,
) {
  const response = await fetch(
    `/api/crm/lead-knowledge?leadId=${encodeURIComponent(leadId)}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  const payload = (await response.json().catch(() => null)) as {
    error?: string;
    items?: CrmLeadKnowledgeItem[];
  } | null;

  if (!response.ok || !Array.isArray(payload?.items)) {
    throw new Error(
      payload?.error ?? "Nao foi possivel carregar a memoria organizacional.",
    );
  }

  return payload.items;
}

export async function createCrmLeadKnowledgeItem(
  accessToken: string,
  input: CreateCrmLeadKnowledgeItemInput,
) {
  const response = await fetch("/api/crm/lead-knowledge", {
    body: JSON.stringify({
      confidence: input.confidence,
      knowledgeCategory: input.knowledgeCategory,
      knowledgeType: input.knowledgeType,
      leadId: input.leadId,
      summary: input.summary,
      title: input.title,
    }),
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  const payload = (await response.json().catch(() => null)) as {
    error?: string;
    item?: CrmLeadKnowledgeItem;
  } | null;

  if (!response.ok || !payload?.item) {
    throw new Error(
      payload?.error ?? "Nao foi possivel criar o conhecimento.",
    );
  }

  return payload.item;
}

export async function archiveCrmLeadKnowledgeItem(
  accessToken: string,
  itemId: string,
) {
  const response = await fetch("/api/crm/lead-knowledge", {
    body: JSON.stringify({ itemId }),
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    method: "PATCH",
  });

  const payload = (await response.json().catch(() => null)) as {
    error?: string;
    item?: CrmLeadKnowledgeItem;
  } | null;

  if (!response.ok || !payload?.item) {
    throw new Error(
      payload?.error ?? "Nao foi possivel arquivar o conhecimento.",
    );
  }

  return payload.item;
}
