import { timingSafeEqual } from "node:crypto";
import type { MetaWebhookChallengeResult, MetaWebhookConfig } from "./types.ts";

export function verifyMetaWebhookChallenge(params: {
  config: Pick<MetaWebhookConfig, "verifyToken">;
  searchParams: URLSearchParams;
}): MetaWebhookChallengeResult {
  const mode = params.searchParams.get("hub.mode");
  const verifyToken = params.searchParams.get("hub.verify_token");
  const challenge = params.searchParams.get("hub.challenge");

  if (!challenge) {
    return jsonResponse("Invalid webhook verification request.", 400);
  }

  if (mode !== "subscribe" || !verifyToken) {
    return jsonResponse("Invalid webhook verification request.", 403);
  }

  if (!safeCompare(verifyToken, params.config.verifyToken)) {
    return jsonResponse("Invalid webhook verification request.", 403);
  }

  return {
    body: challenge,
    contentType: "text/plain",
    status: 200,
  };
}

function safeCompare(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function jsonResponse(error: string, status: number): MetaWebhookChallengeResult {
  return {
    body: JSON.stringify({ error }),
    contentType: "application/json",
    status,
  };
}
