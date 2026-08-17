import {NextResponse,type NextRequest} from "next/server";
import {parseCompleteDraftContractIdentificationInput} from "@/modules/contracts/contract-identification-command";
import {completeDraftContractIdentification} from "@/modules/contracts/contract-identification-server";
export async function POST(request:NextRequest,{params}:{params:Promise<{contractId:string}>}){
 const {contractId}=await params,authorization=request.headers.get("authorization"),token=authorization?.toLowerCase().startsWith("bearer ")?authorization.slice(7).trim()||null:null;
 const input=parseCompleteDraftContractIdentificationInput(await request.json().catch(()=>null),contractId);
 if(!input)return NextResponse.json({error:"CID_INVALID_PAYLOAD"},{status:400});
 const result=await completeDraftContractIdentification(token,input); if(!result.ok)return NextResponse.json({error:result.code},{status:result.status});
 return NextResponse.json({result:result.result});
}
