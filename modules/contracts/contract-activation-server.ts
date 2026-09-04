import {createClient} from "@supabase/supabase-js";
import {activateCommissionScheduleForEvent,cancelFutureCommissionEntriesForContract,ensureContractCommissionSnapshotAndSchedule,reactivateFutureCommissionEntriesForContract} from "@/modules/commission-engine/server";
import {generateRevenueForContract} from "@/modules/revenue/server";
import {getContractById} from "./server";
import {executeContractFinancialEffect} from "./contract-activation-failure";
import type {ContractActivationInput,ContractActivationResult,ContractFinancialAuthority} from "./contract-activation-types";

type Row={id:string;operation:ContractActivationInput["operation"];financial_authority:ContractFinancialAuthority|null;resolution_outcome:ContractActivationResult["resolutionOutcome"];financial_outcome:ContractActivationResult["financialOutcome"];failure_code:string|null;safe_failure_message:string|null};
export type ContractActivationServiceResult={ok:true;result:ContractActivationResult}|{ok:false;status:number;code:string;message:string};

export async function executeCanonicalContractActivation(accessToken:string|null,contractId:string,input:ContractActivationInput):Promise<ContractActivationServiceResult>{
 if(!accessToken)return fail(401,"ACTIVATION_AUTH_REQUIRED","Sessao obrigatoria.");
 const context=await contextFor(accessToken);if(!context.ok)return context;
 const started=await context.supabase.rpc("begin_contract_activation_intent",{p_contract_id:contractId,p_operation:input.operation,p_idempotency_key:input.idempotencyKey,p_selected_authority:input.selectedFinancialAuthority??null});
 if(started.error)return dbFail(started.error.message);
 let row=started.data as Row;
 if(row.resolution_outcome!=="resolved"||row.financial_outcome==="completed"||row.financial_outcome==="not_applicable")return present(accessToken,contractId,row);
 const {finishResult:finished}=await executeContractFinancialEffect(
  ()=>executeAdapter(accessToken,context,row,contractId,input.operation),
  async (result)=>await context.supabase.rpc("finish_contract_activation_intent",{p_intent_id:row.id,p_financial_outcome:result.ok?"completed":"failed",p_failure_code:result.ok?null:"ACTIVATION_FINANCIAL_EFFECT_FAILED",p_safe_failure_message:result.ok?null:result.message}),
 );
 if(finished.error)return fail(500,"ACTIVATION_INTENT_UPDATE_FAILED","O resultado financeiro nao pode ser confirmado.");
 row=finished.data as Row;return present(accessToken,contractId,row);
}

async function executeAdapter(accessToken:string,context:Extract<Awaited<ReturnType<typeof contextFor>>,{ok:true}>,row:Row,contractId:string,operation:ContractActivationInput["operation"]){
 if(row.financial_authority==="not_applicable")return{ok:true as const};
 if(row.financial_authority==="legacy_revenue"){
  if(operation==="deactivate")return{ok:true as const};
  const result=await generateRevenueForContract(accessToken,contractId,"create_missing");return result.ok?{ok:true as const}:{ok:false as const,message:"O processamento financeiro legado requer atencao."};
 }
 if(row.financial_authority!=="commission_engine")return{ok:false as const,message:"A autoridade financeira nao foi resolvida."};
 const contractResult=await getContractById(accessToken,contractId);if(!contractResult.ok)return{ok:false as const,message:"O contrato nao pode ser recarregado."};
 const contract=contractResult.contract,base={contractId,organizationId:context.organizationId,supabase:context.supabase};
 if(operation==="deactivate"){
  const result=await cancelFutureCommissionEntriesForContract({...base,cancelledBy:context.actorId,cancellationReason:"Contrato inativado pela command C9A.",metadata:{source:"contract_activation_command"}});return result.ok?{ok:true as const}:{ok:false as const,message:"O cancelamento financeiro requer atencao."};
 }
 const ensured=await ensureContractCommissionSnapshotAndSchedule({...base,commissionPlanId:contract.commissionPlanId,createdBy:context.actorId});if(!ensured.ok)return{ok:false as const,message:"A configuracao do Commission Engine requer atencao."};
 const eventType="contract_signed"; // Compatibility mapping retained by C9A; activation and signature remain distinct domain concepts.
 const params={...base,eventType,occurredAt:contract.activatedAt??new Date().toISOString(),metadata:{source:"contract_activation_command",domainEvent:"contract_activated"},triggerEventId:`contract-activation:${row.id}`};
 const result=operation==="reactivate"?await reactivateFutureCommissionEntriesForContract(params):await activateCommissionScheduleForEvent(params);
 return result.ok?{ok:true as const}:{ok:false as const,message:"O processamento do Commission Engine requer atencao."};
}

async function present(accessToken:string,contractId:string,row:Row):Promise<ContractActivationServiceResult>{const current=await getContractById(accessToken,contractId);if(!current.ok)return fail(current.status,"ACTIVATION_CONTRACT_NOT_FOUND",current.error);return{ok:true,result:{intentId:row.id,contract:current.contract,operation:row.operation,financialAuthority:row.financial_authority,resolutionOutcome:row.resolution_outcome,financialOutcome:row.financial_outcome,failureCode:row.failure_code,message:row.safe_failure_message}};}
async function contextFor(token:string){try{const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;if(!url||!key)return fail(500,"ACTIVATION_INTERNAL_UNAVAILABLE","Servico indisponivel.");const supabase=createClient(url,key,{auth:{autoRefreshToken:false,detectSessionInUrl:false,persistSession:false},global:{headers:{Authorization:`Bearer ${token}`}}});const user=await supabase.auth.getUser(token);if(user.error||!user.data.user)return fail(401,"ACTIVATION_AUTH_REQUIRED","Sessao invalida.");const profile=await supabase.from("profiles").select("id,organization_id,role,is_active").eq("id",user.data.user.id).maybeSingle<{id:string;organization_id:string|null;role:string|null;is_active:boolean|null}>();if(profile.error||!profile.data?.organization_id||!profile.data.is_active||!(["master","admin"] as const).includes(profile.data.role as "master"|"admin"))return fail(403,"ACTIVATION_FORBIDDEN","Seu perfil nao pode alterar a situacao do contrato.");return{ok:true as const,supabase,actorId:profile.data.id,organizationId:profile.data.organization_id};}catch{return fail(500,"ACTIVATION_INTERNAL_UNAVAILABLE","Servico indisponivel.");}}
function dbFail(message:string){const code=(message.match(/ACTIVATION_[A-Z_]+/)??[])[0]??"ACTIVATION_INTERNAL_UNAVAILABLE";const status=code==="ACTIVATION_FORBIDDEN"?403:code==="ACTIVATION_CONTRACT_NOT_FOUND"?404:code.includes("CONFLICT")||code==="ACTIVATION_AUTHORITY_RECONCILIATION_REQUIRED"?409:400;const safe:Record<string,string>={ACTIVATION_FORBIDDEN:"Seu perfil nao pode alterar a situacao do contrato.",ACTIVATION_TRANSITION_CONFLICT:"A situacao atual nao permite esta operacao.",ACTIVATION_IDEMPOTENCY_CONFLICT:"A chave de idempotencia ja foi usada com outra solicitacao.",ACTIVATION_AUTHORITY_RECONCILIATION_REQUIRED:"A autoridade financeira nao pode ser escolhida enquanto houver registros que exigem reconciliacao.",ACTIVATION_GENERIC_LIFECYCLE_BYPASS:"Use a operacao controlada de situacao contratual.",CID_IDENTIFICATION_REQUIRED_FOR_ACTIVATION:"Complete numero e cota antes de ativar."};return fail(status,code,safe[code]??"Nao foi possivel processar a alteracao contratual.");}
function fail(status:number,code:string,message:string){return{ok:false as const,status,code,message};}
