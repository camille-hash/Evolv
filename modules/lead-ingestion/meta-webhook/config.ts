import type { MetaWebhookConfigResult } from "./types.ts";

export const metaWebhookDefaultMaxBodyBytes = 1024 * 1024;

export function loadMetaWebhookConfig(
  env: NodeJS.ProcessEnv = process.env,
): MetaWebhookConfigResult {
  const verifyToken = env.META_WEBHOOK_VERIFY_TOKEN?.trim();
  const appSecret = env.META_APP_SECRET?.trim();

  if (!verifyToken || !appSecret) {
    return {
      error: "Meta webhook server configuration is missing.",
      ok: false,
      status: 500,
    };
  }

  return {
    config: {
      appSecret,
      maxBodyBytes: normalizeMaxBodyBytes(env.META_WEBHOOK_MAX_BODY_BYTES),
      verifyToken,
    },
    ok: true,
  };
}

function normalizeMaxBodyBytes(value: string | undefined) {
  if (!value) {
    return metaWebhookDefaultMaxBodyBytes;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return metaWebhookDefaultMaxBodyBytes;
  }

  return Math.min(Math.floor(parsed), metaWebhookDefaultMaxBodyBytes);
}
