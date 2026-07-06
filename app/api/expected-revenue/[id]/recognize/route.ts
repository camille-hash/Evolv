import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { recognizeExpectedRevenue } from "@/modules/commission-engine/server";

type RouteContext = {
  params: Promise<Record<string, string | string[] | undefined>>;
};

type RequestProfile = {
  id: string;
  is_active: boolean | null;
  organization_id: string | null;
  role: string | null;
};

type ExpectedRevenueEntryRow = {
  id: string;
  organization_id: string | null;
  remaining_amount: number | string | null;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const accessToken = readBearerToken(request);
  const params = await context.params;
  const id = typeof params.id === "string" ? params.id : null;
  const parsedBody = parseRecognizeExpectedRevenueBody(
    await request.json().catch(() => null),
  );

  if (!id) {
    return NextResponse.json(
      { error: "Receita prevista invalida." },
      { status: 400 },
    );
  }

  if (!parsedBody.ok) {
    return NextResponse.json(
      { error: parsedBody.error },
      { status: parsedBody.status },
    );
  }

  const requestContext = await resolveRequestContext(accessToken);

  if (!requestContext.ok) {
    return NextResponse.json(
      { error: requestContext.error },
      { status: requestContext.status },
    );
  }

  const expectedRevenueLookup = await requestContext.supabase
    .from("expected_revenue_entries")
    .select("id, organization_id, remaining_amount")
    .eq("id", id)
    .eq("organization_id", requestContext.profile.organization_id)
    .is("cancelled_at", null)
    .maybeSingle<ExpectedRevenueEntryRow>();

  if (expectedRevenueLookup.error || !expectedRevenueLookup.data) {
    return NextResponse.json(
      { error: "Receita prevista nao encontrada." },
      { status: 404 },
    );
  }

  const remainingAmount = normalizeNumber(
    expectedRevenueLookup.data.remaining_amount,
  );

  if (remainingAmount === null || remainingAmount <= 0) {
    return NextResponse.json(
      { error: "Esta receita prevista nao possui saldo pendente." },
      { status: 409 },
    );
  }

  if (parsedBody.input.recognizedAmount > remainingAmount) {
    return NextResponse.json(
      { error: "O valor reconhecido nao pode ser maior que o saldo pendente." },
      { status: 400 },
    );
  }

  const result = await recognizeExpectedRevenue({
    createdBy: requestContext.user.id,
    expectedRevenueEntryId: id,
    metadata: {
      source: "operations_revenue_ui",
    },
    notes: parsedBody.input.notes,
    organizationId: requestContext.profile.organization_id,
    recognitionType: "manual",
    recognizedAmount: parsedBody.input.recognizedAmount,
    recognizedAt: parsedBody.input.recognizedAt,
    supabase: requestContext.supabase,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }

  return NextResponse.json({
    expectedRevenueEntry: result.expectedRevenueEntry,
    recognizedRevenueEntry: result.recognizedRevenueEntry,
  });
}

function parseRecognizeExpectedRevenueBody(body: unknown):
  | {
      input: {
        notes: string | null;
        recognizedAmount: number;
        recognizedAt: string;
      };
      ok: true;
    }
  | {
      error: string;
      ok: false;
      status: number;
    } {
  if (!body || typeof body !== "object") {
    return {
      error: "Informe os dados de reconhecimento da receita.",
      ok: false as const,
      status: 400,
    };
  }

  const recognizedAmount = normalizeNumber(
    (body as { recognizedAmount?: unknown }).recognizedAmount,
  );
  const recognizedAt = normalizeText(
    (body as { recognizedAt?: unknown }).recognizedAt,
  );
  const notes = normalizeOptionalText((body as { notes?: unknown }).notes);

  if (recognizedAmount === null || recognizedAmount <= 0) {
    return {
      error: "Informe um valor valido para reconhecimento.",
      ok: false as const,
      status: 400,
    };
  }

  if (!recognizedAt || Number.isNaN(new Date(recognizedAt).getTime())) {
    return {
      error: "Informe uma data de recebimento valida.",
      ok: false as const,
      status: 400,
    };
  }

  return {
    input: {
      notes,
      recognizedAmount,
      recognizedAt,
    },
    ok: true as const,
  };
}

function createServerSupabaseClient(accessToken: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !publishableKey) {
    throw new Error("Supabase environment is not configured.");
  }

  return createClient(supabaseUrl, publishableKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}

async function resolveRequestContext(accessToken: string | null) {
  if (!accessToken) {
    return {
      error: "Sessao invalida.",
      ok: false as const,
      status: 401,
    };
  }

  try {
    const supabase = createServerSupabaseClient(accessToken);
    const { data: userData, error: userError } =
      await supabase.auth.getUser(accessToken);

    if (userError || !userData.user) {
      return {
        error: "Sessao invalida.",
        ok: false as const,
        status: 401,
      };
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, organization_id, role, is_active")
      .eq("id", userData.user.id)
      .maybeSingle<RequestProfile>();

    if (profileError || !isValidProfile(profile)) {
      return {
        error: "Perfil nao encontrado.",
        ok: false as const,
        status: 403,
      };
    }

    return {
      ok: true as const,
      profile,
      supabase,
      user: userData.user,
    };
  } catch {
    return {
      error:
        "Nao foi possivel concluir a operacao. Entre em contato com o administrador.",
      ok: false as const,
      status: 500,
    };
  }
}

function isValidProfile(profile: RequestProfile | null | undefined): profile is
  RequestProfile & {
    is_active: true;
    organization_id: string;
    role: "admin" | "master" | "sdr";
  } {
  return Boolean(
    profile &&
      profile.is_active === true &&
      typeof profile.organization_id === "string" &&
      profile.organization_id.length > 0 &&
      (profile.role === "admin" ||
        profile.role === "master" ||
        profile.role === "sdr"),
  );
}

function readBearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  return authorization.slice("bearer ".length).trim() || null;
}

function normalizeNumber(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (!trimmed) {
      return null;
    }

    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeOptionalText(value: unknown) {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}
