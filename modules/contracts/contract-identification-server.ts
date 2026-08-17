import "server-only";
import {createClient} from "@supabase/supabase-js";
import type {CompleteDraftContractIdentificationInput} from "./contract-identification-command";
import type {CompleteDraftContractIdentificationResult,ContractIdentificationErrorCode} from "./contract-identification-types";
const status:Record<ContractIdentificationErrorCode,number>={CID_AUTH_REQUIRED:401,CID_ACTOR_FORBIDDEN:403,CID_CONTRACT_NOT_FOUND:404,CID_NOT_MATERIALIZED:409,CID_INVALID_PAYLOAD:400,CID_NO_FIELDS:400,CID_NUMBER_INVALID:422,CID_QUOTA_INVALID:422,CID_REASON_REQUIRED:409,CID_STATUS_NOT_ALLOWED:409,CID_NUMBER_CONFLICT:409,CID_QUOTA_CONFLICT:409,CID_CROSS_TENANT_REFERENCE:404,CID_MATERIALIZATION_INCONSISTENT:409,CID_INTERNAL_ERROR:500};
export async function completeDraftContractIdentification(accessToken:string|null,input:CompleteDraftContractIdentificationInput){
 if(!accessToken)return fail("CID_AUTH_REQUIRED");
 const url=process.env.SUPABASE_URL??process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 if(!url||!key)return fail("CID_INTERNAL_ERROR");
 const db=createClient(url,key,{auth:{autoRefreshToken:false,persistSession:false},global:{headers:{Authorization:`Bearer ${accessToken}`}}});
 const {data,error}=await db.rpc("complete_materialized_contract_identification_transaction",{p_contract_id:input.contractId,p_set_contract_number:input.contractNumber!==undefined,p_contract_number:input.contractNumber??null,p_set_contract_quota:input.contractQuota!==undefined,p_contract_quota:input.contractQuota??null,p_reason:input.reason??null});
 if(error)return fail(code(error.message));
 const raw=data as {outcome:"completed"|"corrected"|"unchanged";contract:Record<string,unknown>;auditEventId:string|null};
 return {ok:true as const,result:{...raw,contract:mapContract(raw.contract)} as CompleteDraftContractIdentificationResult};
}
const code=(m:string)=>(Object.keys(status) as ContractIdentificationErrorCode[]).find(c=>m.includes(c))??"CID_INTERNAL_ERROR";
const fail=(c:ContractIdentificationErrorCode)=>({ok:false as const,code:c,error:c,status:status[c]});
const mapContract=(r:Record<string,unknown>)=>({activatedAt:r.activated_at??null,administratorId:r.administrator_id??null,approvedAt:r.approved_at??null,cancelledAt:r.cancelled_at??null,clientId:r.client_id??null,commissionPlanId:r.commission_plan_id??null,commercialCatalogCode:r.commercial_catalog_code??null,completedAt:r.completed_at??null,contemplationModel:r.contemplation_model??null,contractMaterializationId:r.contract_materialization_id??null,contractNumber:r.contract_number??null,createdAt:r.created_at,createdBy:r.created_by??null,creditAmount:Number(r.credit_amount),group:r.contract_group??null,id:r.id,installmentAmount:r.installment_amount===null?null:Number(r.installment_amount),leadId:r.lead_id??null,metadata:r.metadata??{},organizationId:r.organization_id,productType:r.product_type??null,proposalSnapshot:r.proposal_snapshot??{},quota:r.contract_quota??null,rejectedAt:r.rejected_at??null,signedAt:r.signed_at??null,sourceProposalId:r.source_proposal_id??null,sourceCompositionItemKey:r.source_composition_item_key??null,sourceProposalVersion:r.source_proposal_version??null,status:r.status,submittedAt:r.submitted_at??null,termMonths:r.term_months??null,updatedAt:r.updated_at,updatedBy:r.updated_by??null}) as CompleteDraftContractIdentificationResult["contract"];
