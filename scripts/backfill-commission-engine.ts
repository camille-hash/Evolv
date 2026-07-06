import { PostgrestClient } from "@supabase/postgrest-js";
import { createClient } from "@supabase/supabase-js";
import { backfillCommissionEngineForContracts } from "../modules/commission-engine/server.ts";
import type { CommissionEngineSupabaseClient } from "../modules/commission-engine/types.ts";

type ScriptOptions = {
  contractIds: string[];
  contractNumbers: string[];
  dryRun: boolean;
  organizationId: string | null;
};

type ContractLookupRow = {
  contract_number: string | null;
  id: string;
  organization_id: string | null;
};

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const supabaseUrl =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      [
        "Configure SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_URL",
        "e SUPABASE_SERVICE_ROLE_KEY antes de executar o backfill.",
      ].join(" "),
    );
  }

  const keyKind = detectSupabaseKeyKind(serviceRoleKey);
  const supabase = createBackfillSupabaseClient(
    supabaseUrl,
    serviceRoleKey,
  );
  console.log(
    `[backfill-auth] key_kind=${keyKind} client_mode=${resolveClientMode(keyKind)}`,
  );

  const resolvedSelection = await resolveContractSelection(supabase, options);

  if (!resolvedSelection.ok) {
    throw new Error(resolvedSelection.error);
  }

  const result = await backfillCommissionEngineForContracts({
    contractIds: resolvedSelection.contractIds,
    dryRun: options.dryRun,
    organizationId: resolvedSelection.organizationId,
    supabase,
  });

  if (!result.ok) {
    throw new Error(result.error);
  }

  console.log(
    JSON.stringify(
      {
        contractIds: resolvedSelection.contractIds,
        contractNumbers: resolvedSelection.contractNumbers,
        contractsAnalyzed: result.contractsAnalyzed,
        contractsIgnored: result.contractsIgnored,
        dryRun: result.dryRun,
        errors: result.errors,
        expectedRevenueEntriesCreated: result.expectedRevenueEntriesCreated,
        organizationId: resolvedSelection.organizationId,
        scheduleItemsCreated: result.scheduleItemsCreated,
        snapshotsCreated: result.snapshotsCreated,
      },
      null,
      2,
    ),
  );

  console.table(
    result.results.map((item) => ({
      contractId: item.contractId,
      contractNumber: item.contractNumber,
      error: item.error ?? "",
      expectedCreated: item.expectedRevenueEntriesCreated,
      ignoredReason: item.ignoredReason ?? "",
      scheduleCreated: item.scheduleItemsCreated,
      snapshotCreated: item.snapshotCreated ? "yes" : "no",
      status: item.status,
      trigger: item.wouldActivateEventType ?? "",
    })),
  );
}

function createBackfillSupabaseClient(
  supabaseUrl: string,
  serviceRoleKey: string,
) {
  const keyKind = detectSupabaseKeyKind(serviceRoleKey);
  const auth = {
    autoRefreshToken: false,
    detectSessionInUrl: false,
    persistSession: false,
  };

  if (keyKind === "sb_secret") {
    return new PostgrestClient(`${supabaseUrl}/rest/v1`, {
      fetch: createLoggedSecretKeyFetch(serviceRoleKey),
      headers: {
        apikey: serviceRoleKey,
      },
      schema: "public",
    }) as unknown as CommissionEngineSupabaseClient;
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth,
  }) as CommissionEngineSupabaseClient;
}

function createLoggedSecretKeyFetch(serviceRoleKey: string) {
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    headers.delete("Authorization");

    if (!headers.has("apikey")) {
      headers.set("apikey", serviceRoleKey);
    }

    const url = typeof input === "string"
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;
    console.log(
      [
        "[backfill-auth]",
        `request=${new URL(url).pathname}`,
        `method=${init?.method ?? "GET"}`,
        `authorization_present=${headers.has("Authorization")}`,
        `apikey_present=${headers.has("apikey")}`,
      ].join(" "),
    );

    return fetch(input, {
      ...init,
      headers,
    });
  };
}

async function resolveContractSelection(
  supabase: CommissionEngineSupabaseClient,
  options: ScriptOptions,
) {
  const requestedIds = [...options.contractIds];
  const requestedNumbers = [...options.contractNumbers];

  if (!requestedIds.length && !requestedNumbers.length) {
    if (!options.organizationId) {
      return {
        error:
          "Informe --organization-id para backfill amplo ou passe --contract-ids/--contract-numbers.",
        ok: false as const,
      };
    }

    return {
      contractIds: undefined,
      contractNumbers: [],
      ok: true as const,
      organizationId: options.organizationId,
    };
  }

  let query = supabase
    .from("contracts")
    .select("id, organization_id, contract_number");

  if (options.organizationId) {
    query = query.eq("organization_id", options.organizationId);
  }

  if (requestedIds.length && requestedNumbers.length) {
    query = query.or(
      [
        `id.in.(${requestedIds.map(escapeFilterValue).join(",")})`,
        `contract_number.in.(${requestedNumbers.map(escapeFilterValue).join(",")})`,
      ].join(","),
    );
  } else if (requestedIds.length) {
    query = query.in("id", requestedIds);
  } else {
    query = query.in("contract_number", requestedNumbers);
  }

  const { data, error } = await query;

  if (error) {
    return {
      error: `Nao foi possivel localizar os contratos informados: ${error.message}`,
      ok: false as const,
    };
  }

  const contracts = ((data ?? []) as ContractLookupRow[]).filter(
    (row) => row.organization_id,
  );

  if (!contracts.length) {
    return {
      error: "Nenhum contrato encontrado para os filtros informados.",
      ok: false as const,
    };
  }

  const organizationIds = [...new Set(contracts.map((row) => row.organization_id))];

  if (organizationIds.length !== 1 || !organizationIds[0]) {
    return {
      error:
        "Os contratos informados pertencem a organizacoes diferentes. Filtre uma unica organizacao por execucao.",
      ok: false as const,
    };
  }

  return {
    contractIds: contracts.map((row) => row.id),
    contractNumbers: contracts
      .map((row) => row.contract_number)
      .filter((value): value is string => Boolean(value)),
    ok: true as const,
    organizationId: organizationIds[0],
  };
}

function escapeFilterValue(value: string) {
  return `"${value.replace(/"/g, '\\"')}"`;
}

function detectSupabaseKeyKind(serviceRoleKey: string) {
  if (serviceRoleKey.startsWith("sb_secret_")) {
    return "sb_secret";
  }

  if (serviceRoleKey.startsWith("eyJ")) {
    return "jwt_legacy";
  }

  return "unknown";
}

function resolveClientMode(keyKind: ReturnType<typeof detectSupabaseKeyKind>) {
  return keyKind === "sb_secret" ? "postgrest_apikey_only" : "supabase_default";
}

function parseArgs(args: string[]): ScriptOptions {
  const options: ScriptOptions = {
    contractIds: [],
    contractNumbers: [],
    dryRun: false,
    organizationId: null,
  };

  for (const arg of args) {
    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }

    if (arg.startsWith("--organization-id=")) {
      options.organizationId = normalizeOptionalValue(
        arg.replace("--organization-id=", ""),
      );
      continue;
    }

    if (arg.startsWith("--contract-ids=")) {
      options.contractIds = splitCsv(arg.replace("--contract-ids=", ""));
      continue;
    }

    if (arg.startsWith("--contract-numbers=")) {
      options.contractNumbers = splitCsv(arg.replace("--contract-numbers=", ""));
      continue;
    }
  }

  return options;
}

function splitCsv(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeOptionalValue(value: string) {
  const normalizedValue = value.trim();

  return normalizedValue || null;
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  console.log(
    [
      "Uso:",
      "  node --experimental-strip-types scripts/backfill-commission-engine.ts --organization-id=<org-id> --dry-run",
      "  node --experimental-strip-types scripts/backfill-commission-engine.ts --contract-numbers=3177,3178,3179,3180,3111 --dry-run",
      "  node --experimental-strip-types scripts/backfill-commission-engine.ts --contract-ids=<id-1>,<id-2>",
      "",
      "Variaveis obrigatorias:",
      "  SUPABASE_SERVICE_ROLE_KEY",
      "  SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_URL",
    ].join("\n"),
  );
  process.exitCode = 1;
});
