import { NextResponse, type NextRequest } from "next/server";
import {
  createMetaWebhookServiceRoleClient,
  loadMetaWebhookConfig,
  processMetaWebhookNotification,
  verifyMetaWebhookChallenge,
} from "@/modules/lead-ingestion/meta-webhook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const configResult = loadMetaWebhookConfig();

  if (!configResult.ok) {
    return NextResponse.json(
      { error: "Meta webhook server configuration is missing." },
      { status: configResult.status },
    );
  }

  const result = verifyMetaWebhookChallenge({
    config: configResult.config,
    searchParams: request.nextUrl.searchParams,
  });

  if (result.contentType === "text/plain") {
    return new NextResponse(result.body, {
      headers: noStoreHeaders("text/plain"),
      status: result.status,
    });
  }

  return new NextResponse(result.body, {
    headers: noStoreHeaders("application/json"),
    status: result.status,
  });
}

export async function POST(request: NextRequest) {
  const configResult = loadMetaWebhookConfig();

  if (!configResult.ok) {
    return NextResponse.json(
      { error: "Meta webhook server configuration is missing." },
      { headers: noStoreHeaders("application/json"), status: configResult.status },
    );
  }

  const supabase = createMetaWebhookServiceRoleClient();

  if (!supabase) {
    return NextResponse.json(
      { error: "Meta webhook persistence is not configured." },
      { headers: noStoreHeaders("application/json"), status: 500 },
    );
  }

  const contentLength = request.headers.get("content-length");

  if (isContentLengthTooLarge(contentLength, configResult.config.maxBodyBytes)) {
    return NextResponse.json(
      {
        duplicateCount: 0,
        error: "Payload too large.",
        ignoredCount: 0,
        persistedCount: 0,
        received: false,
      },
      { headers: noStoreHeaders("application/json"), status: 413 },
    );
  }

  const rawBodyBytes = new Uint8Array(await request.arrayBuffer());
  const result = await processMetaWebhookNotification({
    config: configResult.config,
    contentLength,
    contentType: request.headers.get("content-type"),
    rawBodyBytes,
    receivedAt: new Date().toISOString(),
    signatureHeader: request.headers.get("x-hub-signature-256"),
    supabase,
  });

  return NextResponse.json(result.body, {
    headers: noStoreHeaders("application/json"),
    status: result.status,
  });
}

function noStoreHeaders(contentType: string) {
  return {
    "cache-control": "no-store",
    "content-type": contentType,
  };
}

function isContentLengthTooLarge(contentLength: string | null, maxBodyBytes: number) {
  if (!contentLength) {
    return false;
  }

  const parsedLength = Number(contentLength);

  return Number.isFinite(parsedLength) && parsedLength > maxBodyBytes;
}
