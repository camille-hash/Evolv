"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { fetchClients } from "@/modules/clients/client";
import type { ClientListItem } from "@/modules/clients/types";
import { projectCommercialProposalV1 } from "@/modules/commercial-proposals/presentation";
import type { CommercialProposal } from "@/modules/commercial-proposals/types";
import { updateLeadCommercialProposalStatus } from "@/modules/crm/client/crm-lead-commercial-proposals-client";
import { completeDraftContractIdentification } from "@/modules/contracts/contract-identification-client";
import { classifyContractIdentificationEdit, getContractIdentificationInteraction, getContractIdentificationState } from "@/modules/contracts/contract-identification-edit";
import { createMaterializationIdempotencyKey, MaterializationRequestError, materializeApprovedCommercialProposal } from "@/modules/contracts/materialization-client";
import { fetchProposalMaterializationExperience } from "@/modules/contracts/materialization-experience-client";
import type { ProposalMaterializationExperience } from "@/modules/contracts/materialization-experience-types";
import type { Contract } from "@/modules/contracts/types";

type Props = { onChanged?: () => void; proposal: CommercialProposal };

export function ProposalMaterializationPanel({ onChanged, proposal }: Props) {
  const proposalId = proposal.id;
  const summary = useMemo(() => projectCommercialProposalV1(proposal), [proposal]);
  const [experience, setExperience] = useState<ProposalMaterializationExperience | null>(null);
  const [clients, setClients] = useState<ClientListItem[]>([]);
  const [clientId, setClientId] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const selectedClient = clients.find((client) => client.id === clientId);
  const count = summary?.items.length ?? 0;
  const creditEach = summary?.items[0]?.credit ?? null;

  async function reload() { const next = await fetchProposalMaterializationExperience(proposalId); setExperience(next); return next; }
  useEffect(() => { void fetchProposalMaterializationExperience(proposalId).then(setExperience).catch(() => setError("Não foi possível consultar a elegibilidade.")); }, [proposalId]);
  useEffect(() => { if (experience?.actorCanManage && !experience.materializationId) void fetchClients(undefined, { limit: 100, status: "active" }).then(setClients).catch(() => setError("Não foi possível carregar os clientes.")); }, [experience?.actorCanManage, experience?.materializationId]);
  const canMaterialize = Boolean(experience?.actorCanManage && !experience.materializationId && !experience.blockers.length && clientId && count);

  async function approve() {
    setBusy(true); setError(null);
    try {
      const token = await import("@/modules/access/supabase-session-token").then(({ requireSupabaseAccessToken }) => requireSupabaseAccessToken("Sessão inválida para aprovar a proposta."));
      await updateLeadCommercialProposalStatus(token, { action: "approve", proposalId });
      setMessage("Proposta aprovada. Selecione o cliente para gerar os contratos."); await reload(); onChanged?.();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível aprovar a proposta."); } finally { setBusy(false); }
  }

  function openConfirmation() {
    if (!canMaterialize) return;
    setError(null);
    setIdempotencyKey((current) => current ?? createMaterializationIdempotencyKey(proposalId));
    setConfirming(true);
  }

  async function materialize() {
    if (!canMaterialize || !idempotencyKey) return;
    setBusy(true); setError(null);
    try {
      const result = await materializeApprovedCommercialProposal(undefined, { clientId, proposalVersionId: proposalId, idempotencyKey });
      setMessage(result.outcome === "already_created" ? "Os contratos já existentes foram recuperados sem duplicação." : `${count} contratos em rascunho foram gerados com sucesso.`);
      setConfirming(false); setIdempotencyKey(null); await reload(); onChanged?.();
    } catch (cause) {
      try {
        const authoritative = await reload();
        if (authoritative.materializationId) {
          setMessage(`${authoritative.contracts.length} contratos em rascunho foram confirmados no estado autoritativo.`);
          setConfirming(false); setIdempotencyKey(null); onChanged?.(); return;
        }
      } catch { /* A chave permanece para uma repetição segura. */ }
      setError(mapMaterializationError(cause));
    } finally { setBusy(false); }
  }

  if (!experience) return <p className="mt-4 text-xs text-muted-foreground">Consultando materialização...</p>;
  return <section className="mt-4 rounded-md border bg-card p-3" aria-label="Materialização contratual">
    <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Materialização contratual</p><span className="rounded-full border px-2 py-1 text-[11px]">{experience.materializationId ? "Contratos gerados" : experience.status === "approved" ? "Aprovada" : experience.status === "generated" ? "Aguardando aprovação" : experience.status}</span></div>
    {!experience.materializationId && experience.status === "approved" && !experience.blockers.length ? <p className="mt-3 text-sm font-medium text-emerald-800">Pronta para gerar contratos</p> : null}
    {experience.blockers.length ? <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-amber-800">{experience.blockers.map((item) => <li key={item}>{item}</li>)}</ul> : null}
    {!experience.actorCanManage ? <p className="mt-3 text-xs text-muted-foreground">Consulta disponível. Materialização e identificação exigem perfil master ou admin.</p> : null}
    {experience.actorCanManage && experience.isCurrentVersion && experience.status !== "approved" && !experience.materializationId ? <div className="mt-3"><Button disabled={busy} onClick={() => void approve()} type="button">{busy ? "Aprovando..." : "Aprovar proposta"}</Button></div> : null}
    {!experience.materializationId && experience.actorCanManage && experience.status === "approved" ? <div className="mt-3 grid gap-3"><label className="grid gap-1 text-xs font-medium">Cliente<select className="rounded-md border bg-background px-3 py-2 text-sm" onChange={(event) => { setClientId(event.target.value); setIdempotencyKey(null); }} value={clientId}><option value="">Selecione o cliente</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}{client.email ? ` — ${client.email}` : ""}</option>)}</select></label><Button disabled={!canMaterialize} onClick={openConfirmation} type="button">Gerar contratos</Button></div> : null}
    {confirming ? <Confirmation proposal={proposal} clientName={selectedClient?.name ?? "Cliente selecionado"} count={count} creditEach={creditEach} totalCredit={summary?.totalCredit ?? null} product={summary?.product ?? null} administrator={summary?.administrator ?? null} group={summary?.groupCode ?? null} busy={busy} onCancel={() => setConfirming(false)} onConfirm={() => void materialize()} /> : null}
    {message ? <p className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 p-2 text-sm text-emerald-900" role="status">{message}</p> : null}
    {error ? <p className="mt-3 rounded-md border border-rose-200 bg-rose-50 p-2 text-sm text-rose-900" role="alert">{error}</p> : null}
    {experience.contracts.length ? <div className="mt-4 grid gap-3"><p className="text-sm font-semibold">Contratos gerados · {experience.contracts.length} contratos em rascunho</p>{experience.contracts.map((contract, index) => <MaterializedContractCard contract={contract} index={index} key={contract.id} onSaved={async () => { await reload(); onChanged?.(); }} canManage={experience.actorCanManage} />)}</div> : null}
  </section>;
}

function Confirmation({ administrator, busy, clientName, count, creditEach, group, onCancel, onConfirm, product, proposal, totalCredit }: { administrator:string|null; busy:boolean; clientName:string; count:number; creditEach:number|null; group:string|null; onCancel:()=>void; onConfirm:()=>void; product:string|null; proposal:CommercialProposal; totalCredit:number|null }) {
  return <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm" role="dialog" aria-label="Confirmar geração de contratos">
    <h4 className="font-semibold">Gerar contratos da proposta</h4>
    <dl className="mt-3 grid gap-x-4 gap-y-2 sm:grid-cols-2"><Datum label="Proposta e versão" value={`${proposal.proposalNumber} · versão ${proposal.version}`} /><Datum label="Cliente selecionado" value={clientName} /><Datum label="Produto" value={product} /><Datum label="Administradora" value={administrator} /><Datum label="Grupo" value={group} /><Datum label="Quantidade" value={`${count} contratos`} /><Datum label="Crédito por contrato" value={money(creditEach)} /><Datum label="Crédito total" value={money(totalCredit)} /><Datum label="Status inicial" value="Rascunho" /><Datum label="Número contratual" value="Preenchido depois" /><Datum label="Cota operacional" value="Preenchida depois" /></dl>
    <p className="mt-4 rounded-md bg-white/70 p-3 text-xs">Esta ação criará um contrato em rascunho para cada cota da proposta aprovada. Os contratos não serão ativados e nenhum efeito financeiro será gerado.</p>
    <div className="mt-4 flex gap-2"><Button disabled={busy} onClick={onConfirm} type="button">{busy ? "Gerando contratos..." : `Gerar ${count} contratos`}</Button><Button disabled={busy} onClick={onCancel} type="button" variant="secondary">Cancelar</Button></div>
  </div>;
}

function Datum({ label, value }: { label:string; value:string|null }) { return value ? <div><dt className="text-xs text-muted-foreground">{label}</dt><dd className="font-medium">{value}</dd></div> : null; }
function money(value:number|null) { return value === null ? null : new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(value); }

function MaterializedContractCard({ canManage, contract, index, onSaved }: { canManage:boolean; contract:Contract; index:number; onSaved:()=>Promise<void> }) {
  const identificationState = getContractIdentificationState(contract.contractNumber, contract.quota);
  const [editing, setEditing] = useState(identificationState !== "complete");
  const interaction = getContractIdentificationInteraction(canManage, identificationState, editing);
  const [number, setNumber] = useState(contract.contractNumber ?? ""); const [quota, setQuota] = useState(contract.quota ?? ""); const [reason, setReason] = useState(""); const [busy, setBusy] = useState(false); const [error, setError] = useState<string|null>(null);
  const edit = classifyContractIdentificationEdit({ editedNumber:number, editedQuota:quota, persistedNumber:contract.contractNumber, persistedQuota:contract.quota });
  const correction = edit.kind === "corrected";
  const disabled = busy || edit.kind === "unchanged" || edit.kind === "removal_blocked" || (correction && !reason.trim());
  const guidance = edit.kind === "removal_blocked" ? "Um identificador já registrado não pode ser removido." : correction ? "Informe o motivo da alteração. O valor anterior permanecerá no histórico." : edit.kind === "unchanged" ? (!contract.contractNumber && !contract.quota ? "Preencha ao menos o número contratual ou a cota operacional." : "Altere ao menos um dos campos.") : (contract.contractNumber || contract.quota) ? "Você pode completar o identificador pendente sem alterar o valor já registrado." : null;
  async function save(){ if(disabled)return; setBusy(true); setError(null); try { await completeDraftContractIdentification(undefined,{ contractId:contract.id, ...edit.changes, ...(correction ? {reason:reason.trim()} : {}) }); await onSaved(); setEditing(false); setReason(""); } catch(cause){setError(mapMaterializationError(cause));} finally{setBusy(false);} }
  function cancel(){ setNumber(contract.contractNumber ?? ""); setQuota(contract.quota ?? ""); setReason(""); setError(null); setEditing(false); }
  return <article className="rounded-md border bg-background p-3">
    <p className="font-medium">Cota {index + 1} · {money(contract.creditAmount)}</p>
    <p className="mt-1 text-xs text-muted-foreground">Contrato em rascunho</p>
    <IdentificationReadOnly contract={contract} state={identificationState} />
    {interaction.showCorrectionAction ? <div className="mt-3"><Button onClick={() => setEditing(true)} type="button" variant="secondary">Corrigir identificação</Button></div> : null}
    {interaction.showEditor ? <div className="mt-3 grid gap-2 sm:grid-cols-2"><label className="grid gap-1 text-xs">Número contratual<input className="rounded-md border px-3 py-2 text-sm" value={number} onChange={(e)=>setNumber(e.target.value)} /></label><label className="grid gap-1 text-xs">Cota operacional<input className="rounded-md border px-3 py-2 text-sm" value={quota} onChange={(e)=>setQuota(e.target.value)} /></label>{correction ? <label className="grid gap-1 text-xs sm:col-span-2">Motivo da correção<input className="rounded-md border px-3 py-2 text-sm" value={reason} onChange={(e)=>setReason(e.target.value)} /></label> : null}{guidance ? <p className="text-xs text-muted-foreground sm:col-span-2">{guidance}</p> : null}<div className="flex gap-2 sm:col-span-2"><Button disabled={disabled} onClick={()=>void save()} type="button">{busy ? "Salvando..." : identificationState === "complete" || correction ? "Corrigir identificação" : "Completar identificação"}</Button>{identificationState === "complete" ? <Button disabled={busy} onClick={cancel} type="button" variant="secondary">Cancelar</Button> : null}</div></div> : null}
    {error ? <p className="mt-2 text-xs text-rose-700" role="alert">{error}</p> : null}
  </article>;
}

function IdentificationReadOnly({ contract, state }: { contract: Contract; state: "complete" | "partial" | "pending" }) {
  const labels = { complete: "Identificação completa", partial: "Identificação parcial", pending: "Identificação pendente" };
  return <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-3"><Datum label="Número contratual" value={contract.contractNumber ?? "Não informado"} /><Datum label="Cota operacional" value={contract.quota ?? "Não informada"} /><Datum label="Estado" value={labels[state]} /></dl>;
}

export function mapMaterializationError(cause: unknown) {
  const code = cause instanceof MaterializationRequestError || cause instanceof Error ? cause.message : "";
  const messages: Record<string,string> = {
    MAT_ACTOR_FORBIDDEN:"Seu perfil não pode gerar contratos.", MAT_CLIENT_INELIGIBLE:"O cliente selecionado não está elegível.", MAT_CLIENT_NOT_FOUND:"O cliente selecionado não foi encontrado.", MAT_VERSION_NOT_CURRENT:"Esta não é a versão atual da proposta.", MAT_PROPOSAL_NOT_APPROVED:"A proposta precisa estar aprovada.", MAT_APPROVAL_REVOKED:"A aprovação desta proposta foi revogada.", MAT_ADMINISTRATOR_REFERENCE_INVALID:"A administradora da proposta não corresponde a um cadastro ativo. Atualize o cadastro antes de tentar novamente.", MAT_IDEMPOTENCY_CONFLICT:"Esta tentativa não corresponde à operação original. Recarregue os dados antes de continuar.", MAT_ALREADY_MATERIALIZED_CONFLICT:"Já existe uma materialização incompatível para esta proposta. Os dados precisam ser revisados.", CID_REASON_REQUIRED:"Informe o motivo da correção.", CID_NUMBER_CONFLICT:"O número contratual já está em uso.", CID_QUOTA_CONFLICT:"A cota informada já está em uso."
  };
  return messages[code] ?? "Não foi possível confirmar o estado da operação. Tente novamente com a mesma solicitação.";
}
