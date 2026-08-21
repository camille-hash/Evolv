import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { ProposalMaterializationExperience } from "./materialization-experience-types";
import type { Contract } from "./types";
import { buildProposalMaterializationBlockers } from "./materialization-experience";

export async function getProposalMaterializationExperience(accessToken: string | null, proposalId: string) {
  if (!accessToken) return { error: "Sessao invalida.", ok: false as const, status: 401 };
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return { error: "Nao foi possivel consultar a materializacao.", ok: false as const, status: 500 };
  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false }, global: { headers: { Authorization: `Bearer ${accessToken}` } } });
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: "Sessao invalida.", ok: false as const, status: 401 };
  const [{ data: profile }, { data: proposal }] = await Promise.all([
    supabase.from("profiles").select("organization_id, role, is_active").eq("id", auth.user.id).maybeSingle(),
    supabase.from("crm_lead_commercial_proposals").select("id, root_proposal_id, status, snapshot_schema_version, snapshot_authority, simulation_id").eq("id", proposalId).maybeSingle(),
  ]);
  if (!profile?.is_active || !profile.organization_id || !proposal) return { error: "Proposta nao encontrada.", ok: false as const, status: 404 };
  const { data: versions } = await supabase.from("crm_lead_commercial_proposals").select("id, version").eq("root_proposal_id", proposal.root_proposal_id).order("version", { ascending: false }).limit(1);
  const currentVersionId = versions?.[0]?.id ?? proposal.id;
  const { data: materialization } = await supabase.from("contract_materializations").select("id").eq("source_root_proposal_id", proposal.root_proposal_id).maybeSingle();
  const { data: rows } = materialization
    ? await supabase.from("contracts").select("*").eq("contract_materialization_id", materialization.id).order("source_composition_item_key", { ascending: true })
    : { data: [] };
  const blockers = buildProposalMaterializationBlockers({
    currentVersionId,
    proposalId: proposal.id,
    simulationId: proposal.simulation_id,
    snapshotAuthority: proposal.snapshot_authority,
    snapshotSchemaVersion: proposal.snapshot_schema_version,
    status: proposal.status,
  });
  const experience: ProposalMaterializationExperience = {
    actorCanManage: profile.role === "master" || profile.role === "admin",
    blockers,
    contracts: (rows ?? []).map(mapContract),
    currentVersionId,
    isCurrentVersion: proposal.id === currentVersionId,
    materializationId: materialization?.id ?? null,
    proposalId: proposal.id,
    status: proposal.status,
  };
  return { experience, ok: true as const };
}

function mapContract(row: Record<string, unknown>): Contract {
  const text = (key: string) => typeof row[key] === "string" ? row[key] as string : null;
  return {
    activatedAt:text("activated_at"), administratorId:text("administrator_id"), approvedAt:text("approved_at"), cancelledAt:text("cancelled_at"), clientId:text("client_id"), commissionPlanId:text("commission_plan_id"), commercialCatalogCode:text("commercial_catalog_code"), completedAt:text("completed_at"), contemplationModel:text("contemplation_model"), contractMaterializationId:text("contract_materialization_id"), contractNumber:text("contract_number"), createdAt:text("created_at") ?? "", createdBy:text("created_by"), creditAmount:Number(row.credit_amount ?? 0), group:text("contract_group"), id:text("id") ?? "", installmentAmount:row.installment_amount == null ? null : Number(row.installment_amount), leadId:text("lead_id"), metadata:(row.metadata ?? {}) as Record<string, unknown>, organizationId:text("organization_id") ?? "", productType:text("product_type"), proposalSnapshot:(row.proposal_snapshot ?? {}) as Record<string, unknown>, quota:text("contract_quota"), rejectedAt:text("rejected_at"), signedAt:text("signed_at"), sourceProposalId:text("source_proposal_id"), sourceCompositionItemKey:text("source_composition_item_key"), sourceProposalVersion:row.source_proposal_version == null ? null : Number(row.source_proposal_version), status:(text("status") ?? "draft") as Contract["status"], submittedAt:text("submitted_at"), termMonths:row.term_months == null ? null : Number(row.term_months), updatedAt:text("updated_at") ?? "", updatedBy:text("updated_by"),
  };
}
