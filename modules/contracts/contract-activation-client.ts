import {requireSupabaseAccessToken} from "@/modules/access/supabase-session-token";
import type {ContractActivationInput,ContractActivationResult} from "./contract-activation-types";

export function createContractActivationIdempotencyKey(){return `activation-ui:${crypto.randomUUID()}`;}
export async function executeContractActivation(contractId:string,input:ContractActivationInput):Promise<ContractActivationResult>{
 const token=await requireSupabaseAccessToken("Sessao invalida para alterar a situacao do contrato.");
 const response=await fetch(`/api/contracts/${encodeURIComponent(contractId)}/activation`,{method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:JSON.stringify(input)});
 const payload=await response.json().catch(()=>null) as {result?:ContractActivationResult;error?:string;message?:string}|null;
 if(!response.ok||!payload?.result)throw new Error(payload?.message??message(payload?.error)??"Nao foi possivel alterar a situacao do contrato.");
 return payload.result;
}
function message(code?:string){return code==="ACTIVATION_FORBIDDEN"?"Seu perfil nao pode alterar a situacao do contrato.":code==="ACTIVATION_TRANSITION_CONFLICT"?"A situacao do contrato mudou. Atualize a pagina e tente novamente.":code==="ACTIVATION_IDEMPOTENCY_CONFLICT"?"Esta tentativa conflita com uma solicitacao anterior.":null;}
