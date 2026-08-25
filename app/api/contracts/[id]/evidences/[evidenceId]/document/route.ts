import {NextResponse,type NextRequest} from "next/server";
import {downloadContractEvidenceDocument} from "@/modules/contracts/contract-evidence-document-server";
export const runtime="nodejs";
const token=(request:NextRequest)=>{const value=request.headers.get("authorization");return value?.toLowerCase().startsWith("bearer ")?value.slice(7).trim()||null:null};
export async function GET(request:NextRequest,{params}:{params:Promise<{id:string;evidenceId:string}>}){const {id,evidenceId}=await params;const result=await downloadContractEvidenceDocument(token(request),id,evidenceId);return result.ok?new Response(result.bytes as BodyInit,{status:200,headers:result.headers}):NextResponse.json({error:result.code,message:result.message},{status:result.status});}
