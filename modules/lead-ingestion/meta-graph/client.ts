import "server-only";

import {
  metaGraphApiVersion,
  metaGraphHost,
  metaGraphLeadFields,
  type MetaGraphFieldData,
  type MetaGraphFieldDataDiagnostic,
  type MetaGraphLeadResult,
  type MetaGraphSafeError,
} from "./types.ts";

const defaultTimeoutMs = 8_000;
const maximumTimeoutMs = 30_000;
const maximumResponseBytes = 1024 * 1024;
const leadIdPattern = /^[A-Za-z0-9_-]{1,200}$/;

export type FetchMetaLeadOptions = {
  signal?: AbortSignal;
  timeoutMs?: number;
};

export async function fetchMetaLead(
  leadgenId: string,
  options: FetchMetaLeadOptions = {},
): Promise<MetaGraphLeadResult> {
  const leadId = leadgenId.trim();

  if (!leadIdPattern.test(leadId)) {
    return graphError("graph_invalid_lead_id", false, "Invalid Meta lead identifier.");
  }

  const config = loadMetaGraphConfig(process.env);

  if (!config.ok) {
    return config;
  }

  const url = new URL(
    `/${metaGraphApiVersion}/${encodeURIComponent(leadId)}`,
    metaGraphHost,
  );
  url.searchParams.set("fields", metaGraphLeadFields.join(","));

  const effectiveTimeoutMs = normalizeTimeoutBudget(options.timeoutMs, config.timeoutMs);
  const timeoutController = new AbortController();
  const timeout = setTimeout(() => timeoutController.abort("timeout"), effectiveTimeoutMs);
  const signal = combineAbortSignals(timeoutController.signal, options.signal);

  try {
    const response = await fetch(url, {
      headers: {
        accept: "application/json",
        authorization: `Bearer ${config.accessToken}`,
      },
      method: "GET",
      signal,
    });
    const bodyResult = await readJsonResponse(response);

    if (!bodyResult.ok) {
      return bodyResult;
    }

    if (!response.ok) {
      return classifyMetaGraphError(response.status, bodyResult.value);
    }

    return parseMetaGraphLead(bodyResult.value, leadId);
  } catch {
    if (timeoutController.signal.aborted) {
      return graphError("graph_timeout", true, "Meta Graph request timed out.");
    }

    if (options.signal?.aborted) {
      return graphError("graph_fetch_failed", true, "Meta Graph request was cancelled.");
    }

    return graphError("graph_fetch_failed", true, "Meta Graph request failed.");
  } finally {
    clearTimeout(timeout);
  }
}

function loadMetaGraphConfig(env: Record<string, string | undefined>) {
  const accessToken = env.META_GRAPH_ACCESS_TOKEN?.trim();

  if (!accessToken) {
    return graphError(
      "graph_configuration_missing",
      false,
      "Meta Graph server configuration is missing.",
    );
  }

  const configuredTimeout = Number(env.META_GRAPH_TIMEOUT_MS);
  const timeoutMs = Number.isFinite(configuredTimeout) && configuredTimeout > 0
    ? Math.min(Math.floor(configuredTimeout), maximumTimeoutMs)
    : defaultTimeoutMs;

  return { accessToken, ok: true as const, timeoutMs };
}

function normalizeTimeoutBudget(requested: number | undefined, configured: number) {
  if (!Number.isFinite(requested) || (requested ?? 0) <= 0) {
    return configured;
  }

  return Math.max(1, Math.min(configured, Math.floor(requested!)));
}

async function readJsonResponse(response: Response) {
  const declaredLength = Number(response.headers.get("content-length"));

  if (Number.isFinite(declaredLength) && declaredLength > maximumResponseBytes) {
    return graphError("graph_invalid_response", false, "Meta Graph response is too large.");
  }

  const bytes = new Uint8Array(await response.arrayBuffer());

  if (bytes.byteLength > maximumResponseBytes) {
    return graphError("graph_invalid_response", false, "Meta Graph response is too large.");
  }

  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return { ok: true as const, value: JSON.parse(text) as unknown };
  } catch {
    return graphError("graph_invalid_response", false, "Meta Graph returned invalid JSON.");
  }
}

function parseMetaGraphLead(value: unknown, expectedId: string): MetaGraphLeadResult {
  if (!isRecord(value) || normalizeText(value.id) !== expectedId) {
    return graphError("graph_invalid_response", false, "Meta Graph returned an invalid lead.");
  }

  if (!Array.isArray(value.field_data)) {
    return graphError("graph_invalid_response", false, "Meta Graph field data is missing.");
  }

  const fieldDataParse = parseFieldData(value.field_data);

  return {
    lead: {
      adId: normalizeText(value.ad_id),
      createdTime: normalizeText(value.created_time),
      fieldData: fieldDataParse.fieldData,
      fieldDataDiagnostic: fieldDataParse.diagnostic,
      formId: normalizeText(value.form_id),
      id: expectedId,
    },
    ok: true,
  };
}

function parseFieldData(entries: unknown[]): {
  diagnostic: MetaGraphFieldDataDiagnostic;
  fieldData: MetaGraphFieldData[];
} {
  const discardedEntryReasons: Record<string, number> = {};
  const fieldData: MetaGraphFieldData[] = [];

  for (const entry of entries) {
    if (!isRecord(entry)) {
      incrementReason(discardedEntryReasons, "entry_not_object");
      continue;
    }

    const name = normalizeText(entry.name);

    if (!name) {
      incrementReason(discardedEntryReasons, "missing_name");
      continue;
    }

    const values = Array.isArray(entry.values)
      ? entry.values.flatMap((item) => normalizeText(item) ?? [])
      : [];

    fieldData.push({ name, values });
  }

  return {
    diagnostic: {
      acceptedEntryCount: fieldData.length,
      discardedEntryCount: entries.length - fieldData.length,
      discardedEntryReasons,
      fieldDataShape: fieldData.map((field) => ({
        name: field.name,
        valueCount: field.values.length,
      })),
      receivedEntryCount: entries.length,
    },
    fieldData,
  };
}

function incrementReason(reasons: Record<string, number>, reason: string) {
  reasons[reason] = (reasons[reason] ?? 0) + 1;
}

function classifyMetaGraphError(status: number, value: unknown): MetaGraphSafeError & { ok: false } {
  const external = isRecord(value) && isRecord(value.error) ? value.error : {};
  const code = normalizeNumber(external.code);
  const subcode = normalizeNumber(external.error_subcode);
  const requestId = normalizeText(external.fbtrace_id);

  if (status === 429 || code === 4 || code === 17 || code === 32 || code === 613 || code === 80001) {
    return graphError("graph_rate_limited", true, "Meta Graph rate limit reached.", status, code, subcode, requestId);
  }

  if (code === 190 || external.type === "OAuthException" && status === 401) {
    return graphError("graph_auth_failed", false, "Meta Graph authentication failed.", status, code, subcode, requestId);
  }

  if (status === 403 || code === 10 || code === 200) {
    return graphError("graph_permission_denied", false, "Meta Graph permission denied.", status, code, subcode, requestId);
  }

  if (status === 404 || code === 100) {
    return graphError("graph_lead_not_found", false, "Meta lead was not found.", status, code, subcode, requestId);
  }

  return graphError("graph_fetch_failed", status >= 500, "Meta Graph request failed.", status, code, subcode, requestId);
}

function graphError(
  category: MetaGraphSafeError["category"],
  retryable: boolean,
  message: string,
  status?: number,
  graphCode?: number,
  graphSubcode?: number,
  requestId?: string,
) {
  return {
    category,
    graphCode,
    graphSubcode,
    message,
    ok: false as const,
    requestId,
    retryable,
    status,
  };
}

function combineAbortSignals(timeoutSignal: AbortSignal, externalSignal?: AbortSignal) {
  if (!externalSignal) {
    return timeoutSignal;
  }

  if (externalSignal.aborted) {
    return externalSignal;
  }

  const controller = new AbortController();
  const abort = () => controller.abort();
  timeoutSignal.addEventListener("abort", abort, { once: true });
  externalSignal.addEventListener("abort", abort, { once: true });
  return controller.signal;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function normalizeText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function normalizeNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}
