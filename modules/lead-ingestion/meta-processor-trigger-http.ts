import "server-only";

import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import {
  metaProcessorTriggerLimits,
  runMetaProcessorTrigger,
  type MetaProcessorTriggerSummary,
} from "./meta-processor-trigger.ts";
import {
  normalizeMetaProcessorFailure,
  type MetaProcessorFailureCode,
  type MetaProcessorFailureStage,
} from "./meta-processor-failure.ts";

const maximumBodyBytes = 4_096;
const allowedFields = new Set(["batchSize", "cycles"]);

type HttpDependencies = {
  clock: () => Date;
  createCorrelationId: () => string;
  env: Record<string, string | undefined>;
  execute: (params: { batchSize: number; cycles: number }) => Promise<MetaProcessorTriggerSummary>;
  logFailure: (entry: MetaProcessorFailureLog) => void;
};

export type MetaProcessorFailureLog = {
  code: MetaProcessorFailureCode;
  correlationId: string;
  event: "meta_lead_processor_failure";
  retryable: boolean;
  stage: MetaProcessorFailureStage;
  timestamp: string;
};

export async function handleMetaProcessorTriggerRequest(request: Request) {
  return handleMetaProcessorTriggerRequestWithDependencies(request, {
    clock: () => new Date(),
    createCorrelationId: randomUUID,
    env: process.env,
    execute: runMetaProcessorTrigger,
    logFailure: (entry) => console.error(JSON.stringify(entry)),
  });
}

export function createMetaProcessorTriggerHttpHandlerForTesting(
  dependencies: Pick<HttpDependencies, "env" | "execute"> & Partial<
    Pick<HttpDependencies, "clock" | "createCorrelationId" | "logFailure">
  >,
) {
  const resolvedDependencies: HttpDependencies = {
    clock: dependencies.clock ?? (() => new Date("2026-08-05T12:00:00.000Z")),
    createCorrelationId: dependencies.createCorrelationId ?? (() => "test-correlation-id"),
    env: dependencies.env,
    execute: dependencies.execute,
    logFailure: dependencies.logFailure ?? (() => undefined),
  };
  return (request: Request) =>
    handleMetaProcessorTriggerRequestWithDependencies(request, resolvedDependencies);
}

async function handleMetaProcessorTriggerRequestWithDependencies(
  request: Request,
  dependencies: HttpDependencies,
) {
  const configuredSecret = dependencies.env.META_LEAD_PROCESSOR_TRIGGER_SECRET?.trim();
  if (!configuredSecret) return jsonError("Service unavailable.", 503);

  const suppliedSecret = readBearerSecret(request.headers.get("authorization"));
  if (!suppliedSecret || !safeEqual(suppliedSecret, configuredSecret)) {
    return jsonError("Unauthorized.", 401);
  }

  if (!isJsonContentType(request.headers.get("content-type"))) {
    return jsonError("Unsupported content type.", 415);
  }

  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maximumBodyBytes) {
    return jsonError("Payload too large.", 413);
  }

  const body = await readBoundedBody(request);
  if (!body.ok) return jsonError("Payload too large.", 413);

  const payload = parsePayload(body.bytes);
  if (!payload.ok) return jsonError("Invalid request payload.", 400);

  try {
    const summary = await dependencies.execute(payload.value);
    return Response.json(summary, { headers: noStoreHeaders(), status: 200 });
  } catch (error) {
    const failure = normalizeMetaProcessorFailure(error);
    try {
      dependencies.logFailure({
        code: failure.code,
        correlationId: dependencies.createCorrelationId(),
        event: "meta_lead_processor_failure",
        retryable: failure.retryable,
        stage: failure.stage,
        timestamp: dependencies.clock().toISOString(),
      });
    } catch {
      // Observability is best-effort and must not alter the sanitized response.
    }
    return jsonError("Meta lead processing failed.", 500);
  }
}

function parsePayload(bytes: Uint8Array) {
  try {
    const value: unknown = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
    if (!isRecord(value) || Object.keys(value).some((key) => !allowedFields.has(key))) {
      return { ok: false as const };
    }
    const batchSize = value.batchSize ?? metaProcessorTriggerLimits.defaultBatchSize;
    const cycles = value.cycles ?? metaProcessorTriggerLimits.defaultCycles;
    if (!isBoundedInteger(batchSize, metaProcessorTriggerLimits.maximumBatchSize) ||
      !isBoundedInteger(cycles, metaProcessorTriggerLimits.maximumCycles)) {
      return { ok: false as const };
    }
    return { ok: true as const, value: { batchSize, cycles } };
  } catch {
    return { ok: false as const };
  }
}

function readBearerSecret(value: string | null) {
  if (!value) return null;
  const match = /^Bearer ([^\s]+)$/.exec(value);
  return match?.[1] ?? null;
}

function safeEqual(left: string, right: string) {
  const leftDigest = createHash("sha256").update(left, "utf8").digest();
  const rightDigest = createHash("sha256").update(right, "utf8").digest();
  return timingSafeEqual(leftDigest, rightDigest);
}

async function readBoundedBody(request: Request) {
  if (!request.body) return { bytes: new Uint8Array(), ok: true as const };

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > maximumBodyBytes) {
      try {
        await reader.cancel();
      } catch {
        // Cancellation is best-effort; the sanitized 413 remains authoritative.
      }
      return { ok: false as const };
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { bytes, ok: true as const };
}

function isJsonContentType(value: string | null) {
  return value?.toLowerCase() === "application/json" ||
    value?.toLowerCase().startsWith("application/json;");
}

function isBoundedInteger(value: unknown, maximum: number): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= maximum;
}

function jsonError(error: string, status: number) {
  return Response.json({ error }, { headers: noStoreHeaders(), status });
}

function noStoreHeaders() {
  return { "cache-control": "no-store", "content-type": "application/json" };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
