import {NextResponse,type NextRequest} from "next/server";
import {changeContractEvidenceStatus} from "@/modules/contracts/contract-evidence-ingestion-server";
export const runtime="nodejs";
const token=(r:NextRequest)=>{const v=r.headers.get("authorization");return v?.toLowerCase().startsWith("bearer ")?v.slice(7).trim()||null:null};
export async function POST(request:NextRequest,{params}:{params:Promise<{id:string;evidenceId:string}>}){const {id,evidenceId}=await params;let body:unknown;try{body=await request.json()}catch{return NextResponse.json({error:"CE_INVALID_PAYLOAD",message:"Payload invalido."},{status:400})}const result=await changeContractEvidenceStatus(token(request),id,evidenceId,body,"validate");return result.ok?NextResponse.json(result.result,{status:result.status}):NextResponse.json({error:result.code,message:result.message},{status:result.status});}
