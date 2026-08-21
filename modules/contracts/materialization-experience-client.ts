import { requireSupabaseAccessToken } from "@/modules/access/supabase-session-token";
import type { ProposalMaterializationExperience } from "./materialization-experience-types";

export async function fetchProposalMaterializationExperience(proposalId: string) {
  const token = await requireSupabaseAccessToken("Sessao invalida para consultar a materializacao.");
  const response = await fetch(`/api/contracts/proposal-materialization?proposalId=${encodeURIComponent(proposalId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const payload = await response.json().catch(() => null) as { error?: string; experience?: ProposalMaterializationExperience } | null;
  if (!response.ok || !payload?.experience) throw new Error(payload?.error ?? "Nao foi possivel consultar a materializacao.");
  return payload.experience;
}
