import { NextResponse,type NextRequest } from "next/server";
import { parseServerDerivedPatrimonialProposalInput } from "@/modules/commercial-proposals/server-derived-patrimonial-command";
import { createServerDerivedPatrimonialProposal } from "@/modules/commercial-proposals/server-derived-patrimonial-service";
export async function POST(request:NextRequest){
  const input=parseServerDerivedPatrimonialProposalInput(await request.json().catch(()=>null));
  if(!input)return NextResponse.json({error:"Intencao patrimonial invalida."},{status:400});
  const authorization=request.headers.get("authorization"); const token=authorization?.toLowerCase().startsWith("bearer ")?authorization.slice(7).trim():null;
  const result=await createServerDerivedPatrimonialProposal(token,input);
  if(!result.ok)return NextResponse.json({error:result.error},{status:result.status});
  return NextResponse.json(result.result,{status:result.result.outcome==="created"?201:200});
}
