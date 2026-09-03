import { NextResponse, type NextRequest } from "next/server";
import { ingestContractEvidence, listContractEvidences } from "@/modules/contracts/contract-evidence-ingestion-server";

export const runtime = "nodejs";
const maxMultipartBytes=16*1024*1024;

function token(request:NextRequest){const value=request.headers.get("authorization");return value?.toLowerCase().startsWith("bearer ")?value.slice(7).trim()||null:null;}
export async function POST(request:NextRequest,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;if(!request.headers.get("content-type")?.toLowerCase().startsWith("multipart/form-data;"))return NextResponse.json({error:"CE_INVALID_PAYLOAD",message:"Use multipart/form-data."},{status:400});
  const length=Number(request.headers.get("content-length"));
  if(!Number.isSafeInteger(length)||length<=0)return NextResponse.json({error:"CE_INVALID_PAYLOAD",message:"Tamanho do formulario obrigatorio."},{status:400});
  if(length>maxMultipartBytes)return NextResponse.json({error:"CE_FILE_TOO_LARGE",message:"O arquivo excede o limite permitido."},{status:413});
  let form:FormData;try{form=await request.formData();}catch{return NextResponse.json({error:"CE_INVALID_PAYLOAD",message:"Formulario multipart invalido."},{status:400});}
  const result=await ingestContractEvidence(token(request),id,form);return result.ok?NextResponse.json({result:result.result},{status:result.status}):NextResponse.json({error:result.code,message:result.message},{status:result.status});
}
export async function GET(request:NextRequest,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;const result=await listContractEvidences(token(request),id);return result.ok?NextResponse.json({evidences:result.evidences,capabilities:result.capabilities}):NextResponse.json({error:result.code,message:result.message},{status:result.status});
}
