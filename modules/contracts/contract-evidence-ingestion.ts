import { createHash } from "node:crypto";
import { parseRecordManualContractEvidenceCommand } from "./contract-evidence-command-types.ts";
import { PdfValidationError, validatePdfStructure } from "./contract-evidence-pdf-validation.ts";
import type { ContractEvidenceType } from "./contract-evidence-types.ts";

export const contractEvidenceMaxBytes = 15 * 1024 * 1024;
const allowedFields = new Set(["evidenceType","idempotencyKey","correlationId","eventAt","externalReference","detail","file"]);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const idempotency = /^[A-Za-z0-9._:-]{8,128}$/;

export type InspectedEvidenceFile = { bytes: Uint8Array; contentSha256: string; extension: "pdf"|"jpg"|"png"; fileSize: number; mediaType: "application/pdf"|"image/jpeg"|"image/png" };
export type EvidenceIngestionIntent = { correlationId: string; detail: Record<string,unknown>; eventAt: string; evidenceType: ContractEvidenceType; externalReference?: string; file: File; idempotencyKey: string };
export type EvidenceLifecycleIntent={idempotencyKey:string;correlationId:string;reason:string|null};
export type EvidenceSupersedeIntent=Omit<EvidenceIngestionIntent,"evidenceType">&{reason:string};

export class EvidenceIngestionError extends Error {
  readonly code:string; readonly status:number;
  constructor(code:string,status:number,message:string){super(message);this.code=code;this.status=status;}
}
export function canUseEvidenceEndpoint(role:string,write:boolean){return role==="master"||role==="admin"||(!write&&role==="sdr");}

function text(entry: FormDataEntryValue|null, name:string, required=true){
  if(typeof entry!=="string") { if(!required && entry===null)return undefined; throw new EvidenceIngestionError("CE_INVALID_PAYLOAD",400,`Campo ${name} invalido.`); }
  const value=entry.trim(); if(!value && required)throw new EvidenceIngestionError("CE_INVALID_PAYLOAD",400,`Campo ${name} obrigatorio.`); return value||undefined;
}

export function parseEvidenceMultipart(form:FormData):EvidenceIngestionIntent{
  const seen=new Set<string>(); for(const key of form.keys()){if(!allowedFields.has(key)||seen.has(key))throw new EvidenceIngestionError("CE_INVALID_PAYLOAD",400,"O formulario contem campos nao permitidos.");seen.add(key);}
  const evidenceType=text(form.get("evidenceType"),"evidenceType")! as ContractEvidenceType;
  if(!["signed_contract","first_installment_payment","patrion_commission_receipt"].includes(evidenceType))throw new EvidenceIngestionError("CE_EVIDENCE_TYPE_INVALID",400,"Tipo de evidencia invalido.");
  const idempotencyKey=text(form.get("idempotencyKey"),"idempotencyKey")!;
  if(!idempotency.test(idempotencyKey))throw new EvidenceIngestionError("CE_INVALID_PAYLOAD",400,"Chave de idempotencia invalida.");
  const eventAt=text(form.get("eventAt"),"eventAt")!; if(!Number.isFinite(Date.parse(eventAt)))throw new EvidenceIngestionError("CE_INVALID_PAYLOAD",400,"Data do evento invalida.");
  const correlationInput=text(form.get("correlationId"),"correlationId",false); const correlationId=correlationInput??crypto.randomUUID();
  if(!uuid.test(correlationId))throw new EvidenceIngestionError("CE_INVALID_PAYLOAD",400,"Correlacao invalida.");
  let detail:unknown; try{detail=JSON.parse(text(form.get("detail"),"detail")!);}catch{throw new EvidenceIngestionError("CE_EVIDENCE_DETAIL_INVALID",422,"Detalhes da evidencia invalidos.");}
  if(!detail||typeof detail!=="object"||Array.isArray(detail))throw new EvidenceIngestionError("CE_EVIDENCE_DETAIL_INVALID",422,"Detalhes da evidencia invalidos.");
  const file=form.get("file"); if(!(file instanceof File))throw new EvidenceIngestionError("CE_INVALID_PAYLOAD",400,"Arquivo obrigatorio.");
  return {correlationId,detail:detail as Record<string,unknown>,eventAt,evidenceType,externalReference:text(form.get("externalReference"),"externalReference",false),file,idempotencyKey};
}

function exactObject(value:unknown,allowed:string[]){if(!value||typeof value!=="object"||Array.isArray(value)||Object.keys(value).some(key=>!allowed.includes(key)))throw new EvidenceIngestionError("CE_INVALID_PAYLOAD",400,"Payload invalido.");return value as Record<string,unknown>;}
function lifecycleReason(value:unknown,required:boolean){if(value===undefined||value===null){if(required)throw new EvidenceIngestionError("CE_REASON_REQUIRED",400,"Motivo obrigatorio.");return null;}if(typeof value!=="string")throw new EvidenceIngestionError("CE_INVALID_PAYLOAD",400,"Motivo invalido.");const reason=value.trim();if((required&&reason.length<3)||reason.length>1000||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(reason))throw new EvidenceIngestionError("CE_INVALID_PAYLOAD",400,"Motivo invalido.");return reason||null;}
export function parseEvidenceLifecycleJson(input:unknown,reasonRequired:boolean):EvidenceLifecycleIntent{const value=exactObject(input,["idempotencyKey","correlationId","reason"]);if(typeof value.idempotencyKey!=="string"||!idempotency.test(value.idempotencyKey))throw new EvidenceIngestionError("CE_INVALID_PAYLOAD",400,"Chave de idempotencia invalida.");const correlationId=value.correlationId===undefined?crypto.randomUUID():value.correlationId;if(typeof correlationId!=="string"||!uuid.test(correlationId))throw new EvidenceIngestionError("CE_INVALID_PAYLOAD",400,"Correlacao invalida.");return{idempotencyKey:value.idempotencyKey,correlationId,reason:lifecycleReason(value.reason,reasonRequired)};}
export function parseEvidenceSupersedeMultipart(form:FormData):EvidenceSupersedeIntent{const allowed=new Set(["idempotencyKey","correlationId","reason","eventAt","externalReference","detail","file"]),seen=new Set<string>();for(const key of form.keys()){if(!allowed.has(key)||seen.has(key))throw new EvidenceIngestionError("CE_INVALID_PAYLOAD",400,"O formulario contem campos nao permitidos.");seen.add(key);}const idempotencyKey=text(form.get("idempotencyKey"),"idempotencyKey")!;if(!idempotency.test(idempotencyKey))throw new EvidenceIngestionError("CE_INVALID_PAYLOAD",400,"Chave de idempotencia invalida.");const correlationId=text(form.get("correlationId"),"correlationId",false)??crypto.randomUUID();if(!uuid.test(correlationId))throw new EvidenceIngestionError("CE_INVALID_PAYLOAD",400,"Correlacao invalida.");const eventAt=text(form.get("eventAt"),"eventAt")!;if(!Number.isFinite(Date.parse(eventAt)))throw new EvidenceIngestionError("CE_INVALID_PAYLOAD",400,"Data invalida.");let detail:unknown;try{detail=JSON.parse(text(form.get("detail"),"detail")!)}catch{throw new EvidenceIngestionError("CE_EVIDENCE_DETAIL_INVALID",422,"Detalhes invalidos.");}if(!detail||typeof detail!=="object"||Array.isArray(detail))throw new EvidenceIngestionError("CE_EVIDENCE_DETAIL_INVALID",422,"Detalhes invalidos.");const file=form.get("file");if(!(file instanceof File))throw new EvidenceIngestionError("CE_INVALID_PAYLOAD",400,"Arquivo obrigatorio.");return{idempotencyKey,correlationId,reason:lifecycleReason(text(form.get("reason"),"reason"),true)!,eventAt,externalReference:text(form.get("externalReference"),"externalReference",false),detail:detail as Record<string,unknown>,file};}

export async function inspectEvidenceFile(file:File):Promise<InspectedEvidenceFile>{
  if(file.size===0)throw new EvidenceIngestionError("CE_FILE_EMPTY",400,"O arquivo esta vazio.");
  if(file.size>contractEvidenceMaxBytes)throw new EvidenceIngestionError("CE_FILE_TOO_LARGE",413,"O arquivo excede 15 MB.");
  const bytes=new Uint8Array(await file.arrayBuffer()); if(bytes.byteLength!==file.size)throw new EvidenceIngestionError("CE_FILE_INVALID",400,"Nao foi possivel validar o arquivo.");
  let mediaType:InspectedEvidenceFile["mediaType"]|null=null; let extension:InspectedEvidenceFile["extension"]|null=null;
  if(bytes.length>=8 && bytes[0]===0x89&&bytes[1]===0x50&&bytes[2]===0x4e&&bytes[3]===0x47&&bytes[4]===0x0d&&bytes[5]===0x0a&&bytes[6]===0x1a&&bytes[7]===0x0a && hasTail(bytes,[0x49,0x45,0x4e,0x44])){mediaType="image/png";extension="png";}
  else if(bytes.length>=4&&bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff&&bytes.at(-2)===0xff&&bytes.at(-1)===0xd9){mediaType="image/jpeg";extension="jpg";}
  else if(bytes.length>=8&&new TextDecoder("ascii").decode(bytes.slice(0,5))==="%PDF-"&&hasTail(bytes,[0x25,0x25,0x45,0x4f,0x46])){mediaType="application/pdf";extension="pdf";}
  if(!mediaType||!extension)throw new EvidenceIngestionError("CE_FILE_TYPE_UNSUPPORTED",415,"Formato de arquivo nao suportado.");
  if(file.type && file.type!==mediaType)throw new EvidenceIngestionError("CE_FILE_MIME_MISMATCH",415,"O tipo declarado nao corresponde ao conteudo.");
  if(mediaType==="application/pdf"){
    try{await validatePdfStructure(bytes);}catch(error){
      if(error instanceof PdfValidationError&&error.kind==="password-protected")throw new EvidenceIngestionError("CE_PDF_PASSWORD_PROTECTED",422,"PDFs protegidos por senha não são aceitos.");
      throw new EvidenceIngestionError("CE_PDF_STRUCTURE_INVALID",422,"O arquivo PDF está corrompido ou não possui uma estrutura válida.");
    }
  }
  return {bytes,contentSha256:sha256(bytes),extension,fileSize:bytes.length,mediaType};
}

function hasTail(bytes:Uint8Array,needle:number[]){const start=Math.max(0,bytes.length-2048); outer:for(let i=start;i<=bytes.length-needle.length;i++){for(let j=0;j<needle.length;j++)if(bytes[i+j]!==needle[j])continue outer;return true;}return false;}
export function sha256(value:Uint8Array|string){return createHash("sha256").update(value).digest("hex");}
export function buildEvidenceObjectPath(input:{organizationId:string;contractId:string;evidenceType:ContractEvidenceType;idempotencyKey:string;contentSha256:string;extension:string}){
  if(!uuid.test(input.organizationId)||!uuid.test(input.contractId)||!/^[a-f0-9]{64}$/.test(input.contentSha256)||!["pdf","jpg","png"].includes(input.extension))throw new EvidenceIngestionError("CE_INVALID_PAYLOAD",400,"Identidade de arquivo invalida.");
  return `${input.organizationId}/${input.contractId}/${input.evidenceType}/${sha256(input.idempotencyKey)}/${input.contentSha256}.${input.extension}`;
}
export function buildSupersedeObjectPath(input:{organizationId:string;contractId:string;evidenceType:ContractEvidenceType;idempotencyKey:string;contentSha256:string;extension:string}){const base=buildEvidenceObjectPath(input).split("/");base.splice(3,0,"supersede");return base.join("/");}

export function buildInternalRecordCommand(intent:EvidenceIngestionIntent,file:InspectedEvidenceFile,actorId:string,contractId:string,path:string){
  return parseRecordManualContractEvidenceCommand({actorId,contractId,evidenceType:intent.evidenceType,idempotencyKey:intent.idempotencyKey,correlationId:intent.correlationId,eventAt:intent.eventAt,externalReference:intent.externalReference??null,file:{storageBucket:"contract-evidences",storageObjectPath:path,contentSha256:file.contentSha256,mediaType:file.mediaType,fileSize:file.fileSize},detail:intent.detail});
}
