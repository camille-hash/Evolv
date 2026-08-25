import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { ContractEvidenceType } from "./contract-evidence-types";

type Failure={ok:false;status:number;code:string;message:string};
type Success={ok:true;bytes:Uint8Array;headers:Record<string,string>};
type Profile={id:string;organization_id:string;role:"master"|"admin"|"sdr";is_active:boolean};
type Evidence={id:string;organization_id:string;contract_id:string;evidence_type:ContractEvidenceType;status:string;event_at:string};
type InternalEvidence=Evidence&{storage_bucket:string|null;storage_object_path:string|null;content_sha256:string|null;media_type:string|null;file_size:number|null};
const bucket="contract-evidences",maxBytes=15*1024*1024;
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const media={"application/pdf":"pdf","image/jpeg":"jpg","image/png":"png"} as const;

export async function downloadContractEvidenceDocument(token:string|null,contractId:string,evidenceId:string):Promise<Success|Failure>{
  if(!token)return fail(401,"CED_SESSION_REQUIRED","Sessao obrigatoria.");
  if(!uuid.test(contractId)||!uuid.test(evidenceId))return fail(404,"CED_DOCUMENT_NOT_FOUND","Documento nao encontrado.");
  const config=configuration();if(!config)return fail(503,"CED_INTERNAL_UNAVAILABLE","Servico interno indisponivel.");
  const reader=createClient(config.url,config.publicKey,{auth:{autoRefreshToken:false,persistSession:false},global:{headers:{Authorization:`Bearer ${token}`}}});
  const user=await reader.auth.getUser(token);if(user.error||!user.data.user)return fail(401,"CED_SESSION_REQUIRED","Sessao invalida.");
  const profileResult=await reader.from("profiles").select("id,organization_id,role,is_active").eq("id",user.data.user.id).maybeSingle<Profile>();
  if(profileResult.error||!profileResult.data||!profileResult.data.is_active||!["master","admin","sdr"].includes(profileResult.data.role))return fail(403,"CED_ACTOR_FORBIDDEN","Usuario sem permissao para esta operacao.");
  const profile=profileResult.data;
  const contract=await reader.from("contracts").select("id").eq("id",contractId).eq("organization_id",profile.organization_id).maybeSingle();
  if(contract.error||!contract.data)return fail(404,"CED_DOCUMENT_NOT_FOUND","Documento nao encontrado.");
  const visible=await reader.from("contract_evidences").select("id,organization_id,contract_id,evidence_type,status,event_at").eq("id",evidenceId).eq("contract_id",contractId).eq("organization_id",profile.organization_id).maybeSingle<Evidence>();
  if(visible.error||!visible.data||!["recorded","validated","invalidated","superseded"].includes(visible.data.status))return fail(404,"CED_DOCUMENT_NOT_FOUND","Documento nao encontrado.");
  const internal=createClient(config.url,config.serviceKey,{auth:{autoRefreshToken:false,persistSession:false}});
  const identity=await internal.from("contract_evidences").select("id,organization_id,contract_id,evidence_type,status,event_at,storage_bucket,storage_object_path,content_sha256,media_type,file_size").eq("id",evidenceId).eq("contract_id",contractId).eq("organization_id",profile.organization_id).maybeSingle<InternalEvidence>();
  if(identity.error||!identity.data)return fail(404,"CED_DOCUMENT_NOT_FOUND","Documento nao encontrado.");
  const evidence=identity.data,correlationId=randomUUID();
  if(!hasDocument(evidence))return auditFailure(internal,profile,contractId,evidenceId,correlationId,"object_missing","CED_OBJECT_MISSING",404,"CED_DOCUMENT_NOT_FOUND","Documento nao encontrado.");
  if(!extensionForMediaType(evidence.media_type))return auditFailure(internal,profile,contractId,evidenceId,correlationId,"integrity_failed","CED_DOCUMENT_INTEGRITY_FAILED",415,"CED_MEDIA_TYPE_INVALID","Tipo de documento nao permitido.");
  if(!validIdentity(evidence))return auditFailure(internal,profile,contractId,evidenceId,correlationId,"integrity_failed","CED_DOCUMENT_INTEGRITY_FAILED",409,"CED_STORAGE_REFERENCE_INVALID","Referencia interna do documento invalida.");
  const downloaded=await internal.storage.from(bucket).download(evidence.storage_object_path);
  if(downloaded.error||!downloaded.data){
    const missing=Number((downloaded.error as {status?:number}).status)===404||String((downloaded.error as {statusCode?:string}).statusCode)==="404";
    if(missing)return auditFailure(internal,profile,contractId,evidenceId,correlationId,"object_missing","CED_OBJECT_MISSING",409,"CED_OBJECT_MISSING","Documento indisponivel.");
    return fail(503,"CED_INTERNAL_UNAVAILABLE","Servico interno indisponivel.");
  }
  if(downloaded.data.size>maxBytes){
    return auditFailure(internal,profile,contractId,evidenceId,correlationId,"integrity_failed","CED_DOCUMENT_INTEGRITY_FAILED",409,"CED_DOCUMENT_INTEGRITY_FAILED","A integridade do documento nao pode ser confirmada.");
  }
  const bytes=new Uint8Array(await downloaded.data.arrayBuffer());
  const expectedHash=decodeBytea(evidence.content_sha256);
  if(bytes.length!==evidence.file_size||bytes.length>maxBytes||!expectedHash||createHash("sha256").update(bytes).digest("hex")!==expectedHash){
    return auditFailure(internal,profile,contractId,evidenceId,correlationId,"integrity_failed","CED_DOCUMENT_INTEGRITY_FAILED",409,"CED_DOCUMENT_INTEGRITY_FAILED","A integridade do documento nao pode ser confirmada.");
  }
  const audited=await audit(internal,profile,contractId,evidenceId,"downloaded",evidence.media_type,evidence.file_size,correlationId,null);
  if(!audited)return fail(503,"CED_AUDIT_FAILED","Nao foi possivel auditar o acesso ao documento.");
  const extension=media[evidence.media_type as keyof typeof media];
  const date=Number.isFinite(Date.parse(evidence.event_at))?new Date(evidence.event_at).toISOString().slice(0,10):"sem-data";
  const filename=`evidencia-contratual-${evidence.evidence_type}-${date}.${extension}`;
  return{ok:true,bytes,headers:{
    "Content-Type":evidence.media_type,
    "Content-Length":String(bytes.length),
    "Content-Disposition":`attachment; filename="${filename}"`,
    "X-Content-Type-Options":"nosniff",
    "Cache-Control":"private, no-store",
    "Pragma":"no-cache",
    "Content-Security-Policy":"default-src 'none'; sandbox",
  }};
}

function hasDocument(value:InternalEvidence){return Boolean(value.storage_bucket||value.storage_object_path||value.content_sha256||value.media_type||value.file_size);}
function validIdentity(value:InternalEvidence):value is InternalEvidence&{storage_bucket:string;storage_object_path:string;content_sha256:string;media_type:keyof typeof media;file_size:number}{
  const extension=extensionForMediaType(value.media_type);
  if(value.storage_bucket!==bucket||!value.storage_object_path||!value.content_sha256||!extension||!Number.isSafeInteger(value.file_size)||!value.file_size||value.file_size<1||value.file_size>maxBytes)return false;
  const prefix=`${value.organization_id}/${value.contract_id}/${value.evidence_type}/`;
  if(!value.storage_object_path.startsWith(prefix)||value.storage_object_path.includes("..")||value.storage_object_path.includes("\\")||value.storage_object_path.includes("//"))return false;
  const suffix=value.storage_object_path.slice(prefix.length);
  return /^(?:supersede\/)?[a-f0-9]{64}\/[a-f0-9]{64}\.(?:pdf|jpg|png)$/.test(suffix)&&value.storage_object_path.endsWith(`.${extension}`);
}
function extensionForMediaType(value:string|null){if(value==="application/pdf")return"pdf";if(value==="image/jpeg")return"jpg";if(value==="image/png")return"png";return null;}
function decodeBytea(value:string|null){if(!value)return null;const normalized=value.startsWith("\\x")?value.slice(2):value;return /^[a-f0-9]{64}$/i.test(normalized)?normalized.toLowerCase():null;}
async function auditFailure(client:SupabaseClient,profile:Profile,contractId:string,evidenceId:string,correlationId:string,outcome:"integrity_failed"|"object_missing",failureCode:string,status:number,code:string,message:string):Promise<Failure>{
  const recorded=await audit(client,profile,contractId,evidenceId,outcome,null,null,correlationId,failureCode);return recorded?fail(status,code,message):fail(503,"CED_AUDIT_FAILED","O download falhou e nao foi possivel auditar a tentativa.");
}
async function audit(client:SupabaseClient,profile:Profile,contractId:string,evidenceId:string,outcome:string,mediaType:string|null,fileSize:number|null,correlationId:string,failureCode:string|null){const result=await client.rpc("record_contract_evidence_document_access_transaction",{p_actor_id:profile.id,p_contract_id:contractId,p_evidence_id:evidenceId,p_outcome:outcome,p_media_type:mediaType,p_file_size:fileSize,p_correlation_id:correlationId,p_failure_code:failureCode});return !result.error;}
function configuration(){const url=process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();const publicKey=(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)?.trim();const serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();return url&&publicKey&&serviceKey?{url,publicKey,serviceKey}:null;}
function fail(status:number,code:string,message:string):Failure{return{ok:false,status,code,message};}
