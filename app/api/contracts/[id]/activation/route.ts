import {NextResponse,type NextRequest} from "next/server";
import {parseContractActivationInput} from "@/modules/contracts/contract-activation-command";
import {executeCanonicalContractActivation} from "@/modules/contracts/contract-activation-server";
export const runtime="nodejs";
export async function POST(request:NextRequest,{params}:{params:Promise<{id:string}>}){const {id}=await params;const input=parseContractActivationInput(await request.json().catch(()=>null));if(!input)return NextResponse.json({error:"ACTIVATION_INVALID_PAYLOAD",message:"Solicitacao de alteracao invalida."},{status:400});const auth=request.headers.get("authorization"),token=auth?.toLowerCase().startsWith("bearer ")?auth.slice(7).trim()||null:null;const result=await executeCanonicalContractActivation(token,id,input);return result.ok?NextResponse.json({result:result.result}):NextResponse.json({error:result.code,message:result.message},{status:result.status});}
