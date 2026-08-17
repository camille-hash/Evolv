import {requireSupabaseAccessToken} from "@/modules/access/supabase-session-token";
import type {CompleteDraftContractIdentificationInput} from "./contract-identification-command";
import type {CompleteDraftContractIdentificationResult} from "./contract-identification-types";
export async function completeDraftContractIdentification(accessToken:string|null|undefined,input:CompleteDraftContractIdentificationInput):Promise<CompleteDraftContractIdentificationResult>{
 const token=accessToken??await requireSupabaseAccessToken("Sessao invalida para identificar contrato.");
 const {contractId,...body}=input; const response=await fetch(`/api/contracts/${encodeURIComponent(contractId)}/complete-identification`,{method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:JSON.stringify(body)});
 const payload=await response.json().catch(()=>null) as {result?:CompleteDraftContractIdentificationResult;error?:string}|null;
 if(!response.ok||!payload?.result)throw new Error(payload?.error??"CID_INTERNAL_ERROR"); return payload.result;
}
