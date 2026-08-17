import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { calculateCommercialTermsHash } from "./snapshot-v1";
import { buildServerDerivedPatrimonialSnapshot } from "./server-derived-patrimonial";
import type { CreateServerDerivedPatrimonialProposalInput } from "./server-derived-patrimonial-command";
import { buildReferenceCapitalStrategySnapshot, calculateReferenceCapitalExclusiveStrategy, referenceCapitalEngineKey, referenceCapitalEngineVersion, referenceCapitalProductKey, referenceCapitalProductVersion } from "../patrimonial-strategy/reference-capital-2227";

export async function createServerDerivedPatrimonialProposal(accessToken:string|null,input:CreateServerDerivedPatrimonialProposalInput) {
  if(!accessToken) return failure(401,"Sessao invalida.");
  const url=process.env.SUPABASE_URL??process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publicKey=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!publicKey||!serviceKey) return failure(503,"Persistencia interna indisponivel.");
  const auth=createClient(url,publicKey,{auth:{autoRefreshToken:false,persistSession:false},global:{headers:{Authorization:`Bearer ${accessToken}`}}});
  const {data:userData}=await auth.auth.getUser(accessToken); if(!userData.user) return failure(401,"Sessao invalida.");
  const {data:profile}=await auth.from("profiles").select("id,organization_id,role,is_active").eq("id",userData.user.id).maybeSingle();
  if(!profile||profile.is_active!==true||!["master","admin","sdr"].includes(profile.role)||!profile.organization_id) return failure(403,"Operacao nao autorizada.");
  const {data:lead}=await auth.from("crm_leads").select("id,organization_id,nome").eq("id",input.leadId).maybeSingle();
  if(!lead||lead.organization_id!==profile.organization_id) return failure(404,"Lead nao encontrado.");
  const {data:administrators}=await auth.from("administrators").select("id,slug,status").eq("organization_id",profile.organization_id).eq("slug","rodobens");
  const active=(administrators??[]).filter(a=>a.status==="active");
  const administratorTechnicalId=active.length===1?active[0].id:null;
  const result=calculateReferenceCapitalExclusiveStrategy({quotas:input.intent.quotas.map(q=>({creditAmount:q.creditAmountCents/100,contemplationScenarioMonth:q.contemplationScenarioMonth}))});
  const simulationId=randomUUID(); const proposalId=randomUUID();
  const strategySnapshot=buildReferenceCapitalStrategySnapshot({leadContext:{leadId:lead.id,leadName:lead.nome},result});
  const snapshot=buildServerDerivedPatrimonialSnapshot({administratorTechnicalId,customerDisplayName:lead.nome,customerId:lead.id,result,simulationId});
  const commercialTermsHash=calculateCommercialTermsHash(snapshot);
  const normalizedIntent={quotas:input.intent.quotas};
  const intentHash=createHash("sha256").update(JSON.stringify({leadId:lead.id,intent:normalizedIntent})).digest("hex");
  const privileged=createClient(url,serviceKey,{auth:{autoRefreshToken:false,persistSession:false}});
  const {data,error}=await privileged.rpc("create_server_derived_patrimonial_proposal_transaction",{p_actor_id:profile.id,p_calculation_snapshot:strategySnapshot,p_commercial_terms_hash:commercialTermsHash,p_idempotency_key:input.idempotencyKey,p_intent_hash:intentHash,p_lead_id:lead.id,p_organization_id:profile.organization_id,p_proposal_id:proposalId,p_saved_snapshot:snapshot,p_simulation_id:simulationId,p_technical_input:{intent:normalizedIntent,calculationEngineKey:referenceCapitalEngineKey,calculationEngineVersion:referenceCapitalEngineVersion,financialProductKey:referenceCapitalProductKey,financialProductVersion:referenceCapitalProductVersion}});
  if(error) return error.message.includes("CP_IDEMPOTENCY_CONFLICT")?failure(409,"Chave de idempotencia reutilizada com outra intencao."):failure(500,"Nao foi possivel criar a proposta patrimonial.");
  return {ok:true as const,result:data as {outcome:"created"|"already_created";proposal:Record<string,unknown>;simulation:Record<string,unknown>}};
}
const failure=(status:number,error:string)=>({ok:false as const,status,error});
