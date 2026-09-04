import {NextResponse} from "next/server";

export async function POST(){
 return NextResponse.json({error:"ACTIVATION_GENERIC_LIFECYCLE_BYPASS",message:"Use a operacao controlada de situacao contratual."},{status:409});
}
