import type { NextRequest } from "next/server";
import { handleMetaProcessorTriggerRequest } from "@/modules/lead-ingestion/meta-processor-trigger-http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  return handleMetaProcessorTriggerRequest(request);
}
