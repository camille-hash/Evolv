import type {
  CreateKnowledgeEvidenceInput,
  KnowledgeEvidence,
} from "@/modules/crm";

export async function fetchKnowledgeEvidence(
  accessToken: string,
  knowledgeItemId: string,
) {
  const response = await fetch(
    `/api/crm/knowledge-evidence?knowledgeItemId=${encodeURIComponent(
      knowledgeItemId,
    )}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  const payload = (await response.json().catch(() => null)) as {
    error?: string;
    evidence?: KnowledgeEvidence[];
  } | null;

  if (!response.ok || !Array.isArray(payload?.evidence)) {
    throw new Error(
      payload?.error ?? "Nao foi possivel carregar as evidencias.",
    );
  }

  return payload.evidence;
}

export async function createKnowledgeEvidence(
  accessToken: string,
  input: CreateKnowledgeEvidenceInput,
) {
  const response = await fetch("/api/crm/knowledge-evidence", {
    body: JSON.stringify({
      evidenceType: input.evidenceType,
      knowledgeItemId: input.knowledgeItemId,
      source: input.source,
      sourceReference: input.sourceReference,
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
    evidence?: KnowledgeEvidence;
  } | null;

  if (!response.ok || !payload?.evidence) {
    throw new Error(payload?.error ?? "Nao foi possivel criar a evidencia.");
  }

  return payload.evidence;
}

export async function archiveKnowledgeEvidence(
  accessToken: string,
  evidenceId: string,
) {
  const response = await fetch("/api/crm/knowledge-evidence", {
    body: JSON.stringify({ evidenceId }),
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    method: "PATCH",
  });

  const payload = (await response.json().catch(() => null)) as {
    error?: string;
    evidence?: KnowledgeEvidence;
  } | null;

  if (!response.ok || !payload?.evidence) {
    throw new Error(payload?.error ?? "Nao foi possivel arquivar a evidencia.");
  }

  return payload.evidence;
}
