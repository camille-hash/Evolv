"use client";

import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import type {
  DecisionTimelineEvent,
  DecisionTimelineResponse,
} from "@/modules/decision-observatory";

type TimelineHttpResult = {
  body: unknown;
  ok: boolean;
  status: number;
  statusText: string;
};

type TimelineFilters = {
  dateFrom: string;
  dateTo: string;
  leadId: string;
  limit: string;
  modelId: string;
  modelVersion: string;
};

const defaultFilters: TimelineFilters = {
  dateFrom: "",
  dateTo: "",
  leadId: "",
  limit: "50",
  modelId: "",
  modelVersion: "",
};

export default function DecisionTimelinePage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [authStatus, setAuthStatus] = useState("Verificando sessao...");
  const [filters, setFilters] = useState<TimelineFilters>(() => ({
    ...defaultFilters,
    leadId: readInitialLeadId(),
  }));
  const [response, setResponse] = useState<DecisionTimelineResponse | null>(
    null,
  );
  const [lastResult, setLastResult] = useState<TimelineHttpResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadSession() {
      const { data, error } = await supabase.auth.getSession();

      if (!isMounted) {
        return;
      }

      if (error || !data.session?.access_token) {
        setAuthStatus("Sessao indisponivel ou expirada.");
        setAccessToken(null);
        return;
      }

      setAccessToken(data.session.access_token);
      setAuthStatus(
        `Sessao Supabase ativa para ${data.session.user.email ?? data.session.user.id}.`,
      );
    }

    void loadSession();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!isMounted) {
          return;
        }

        setAccessToken(session?.access_token ?? null);
        setAuthStatus(
          session?.access_token
            ? `Sessao Supabase ativa para ${session.user.email ?? session.user.id}.`
            : "Sessao indisponivel ou expirada.",
        );
      },
    );

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (accessToken && filters.leadId.trim()) {
      void loadTimeline();
    }
    // Initial load is driven by session + leadId from URL. Filter changes are explicit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  async function loadTimeline() {
    if (!accessToken || !filters.leadId.trim()) {
      return;
    }

    setIsLoading(true);
    setLastResult(null);

    const result = await requestJson(
      `/api/decision-observatory/timeline?${buildQueryString(filters)}`,
    );

    setLastResult(result);

    if (result.ok && isTimelineResponse(result.body)) {
      setResponse(result.body);
    } else {
      setResponse(null);
    }

    setIsLoading(false);
  }

  async function requestJson(path: string): Promise<TimelineHttpResult> {
    if (!accessToken) {
      return {
        body: { error: "Sessao indisponivel ou expirada." },
        ok: false,
        status: 401,
        statusText: "Unauthorized",
      };
    }

    const fetchResponse = await fetch(path, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const text = await fetchResponse.text();

    return {
      body: parseJsonBody(text),
      ok: fetchResponse.ok,
      status: fetchResponse.status,
      statusText: fetchResponse.statusText,
    };
  }

  function updateFilter(key: keyof TimelineFilters, value: string) {
    setFilters((current) => ({
      ...current,
      [key]: value,
    }));
  }

  return (
    <main className="min-h-screen bg-background p-5 text-foreground sm:p-8">
      <section className="mx-auto grid max-w-5xl gap-6">
        <header className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            EVOLV interno
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-normal">
            Decision Timeline
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Evolucao cronologica dos Decision Outputs persistidos para um Lead.
            Esta tela e read-only e nao executa Decision Models.
          </p>
        </header>

        <section className="executive-surface grid gap-4 rounded-md p-5">
          <p className="rounded-md border bg-card px-3 py-2 text-sm text-muted-foreground">
            {authStatus}
          </p>

          <div className="grid gap-3 md:grid-cols-3">
            <FilterInput
              label="Lead ID"
              onChange={(value) => updateFilter("leadId", value)}
              placeholder="UUID do lead"
              value={filters.leadId}
            />
            <FilterInput
              label="Modelo"
              onChange={(value) => updateFilter("modelId", value)}
              placeholder="DM-001"
              value={filters.modelId}
            />
            <FilterInput
              label="Versao"
              onChange={(value) => updateFilter("modelVersion", value)}
              placeholder="0.1.0-i1"
              value={filters.modelVersion}
            />
            <FilterInput
              label="Data inicial"
              onChange={(value) => updateFilter("dateFrom", value)}
              type="datetime-local"
              value={filters.dateFrom}
            />
            <FilterInput
              label="Data final"
              onChange={(value) => updateFilter("dateTo", value)}
              type="datetime-local"
              value={filters.dateTo}
            />
            <FilterInput
              label="Limite"
              onChange={(value) => updateFilter("limit", value)}
              placeholder="50"
              type="number"
              value={filters.limit}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              disabled={!accessToken || !filters.leadId.trim() || isLoading}
              onClick={() => void loadTimeline()}
              type="button"
            >
              {isLoading ? "Carregando..." : "Carregar timeline"}
            </Button>
            <Button
              onClick={() => {
                setFilters(defaultFilters);
                setResponse(null);
                setLastResult(null);
              }}
              type="button"
              variant="secondary"
            >
              Limpar
            </Button>
          </div>
        </section>

        {lastResult && !lastResult.ok ? (
          <p className="rounded-md border border-dashed bg-card px-3 py-3 text-sm text-muted-foreground">
            Nao foi possivel carregar a Decision Timeline. Status{" "}
            {lastResult.status}.
          </p>
        ) : null}

        <DecisionTimelineList
          events={response?.events ?? []}
          isLoading={isLoading}
        />
      </section>
    </main>
  );
}

function DecisionTimelineList({
  events,
  isLoading,
}: {
  events: DecisionTimelineEvent[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <p className="rounded-md border border-dashed bg-card px-3 py-3 text-sm text-muted-foreground">
        Carregando Decision Timeline...
      </p>
    );
  }

  if (!events.length) {
    return (
      <p className="rounded-md border border-dashed bg-card px-3 py-3 text-sm text-muted-foreground">
        Nenhum Decision Output encontrado para este Lead.
      </p>
    );
  }

  return (
    <section className="grid gap-3">
      {events.map((event) => (
        <article
          className="grid gap-3 rounded-md border bg-card p-4 sm:grid-cols-[160px_1fr_auto]"
          key={event.id}
        >
          <div className="text-sm text-muted-foreground">
            {formatDateTime(event.createdAt)}
          </div>
          <div className="grid gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-foreground">
                {event.modelId}
              </span>
              <span className="text-xs text-muted-foreground">
                {event.modelVersion ? `v${event.modelVersion}` : "sem versao"}
              </span>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <TimelineMetric label="Decisao" value={event.decision ?? "-"} />
              <TimelineMetric label="Score" value={formatMetric(event.score)} />
              <TimelineMetric
                label="Confidence"
                value={formatMetric(event.confidence)}
              />
            </div>
            <p className="text-sm leading-6 text-muted-foreground">
              {event.rationaleSummary ?? "Rationale resumido indisponivel."}
            </p>
          </div>
          <div className="sm:justify-self-end">
            <Button asChild size="sm" variant="secondary">
              <Link href={`/internal/decision-inspector?outputId=${event.id}`}>
                Inspecionar
              </Link>
            </Button>
          </div>
        </article>
      ))}
    </section>
  );
}

function TimelineMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-background/70 px-3 py-2">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-medium text-foreground">
        {value}
      </p>
    </div>
  );
}

function FilterInput({
  label,
  onChange,
  placeholder,
  type = "text",
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  value: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      {label}
      <input
        className="rounded-md border bg-background px-3 py-2 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/15"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type={type}
        value={value}
      />
    </label>
  );
}

function buildQueryString(filters: TimelineFilters) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(filters)) {
    if (value) {
      params.set(key, normalizeDateFilterValue(key, value));
    }
  }

  return params.toString();
}

function normalizeDateFilterValue(key: string, value: string) {
  if ((key === "dateFrom" || key === "dateTo") && value) {
    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? value : date.toISOString();
  }

  return value;
}

function readInitialLeadId() {
  if (typeof window === "undefined") {
    return "";
  }

  return new URLSearchParams(window.location.search).get("leadId")?.trim() ?? "";
}

function createSupabaseBrowserClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !publishableKey) {
    throw new Error("Supabase environment is not configured.");
  }

  return createClient(supabaseUrl, publishableKey, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: true,
      persistSession: true,
    },
  });
}

function isTimelineResponse(value: unknown): value is DecisionTimelineResponse {
  return Boolean(
    value &&
      typeof value === "object" &&
      "events" in value &&
      "filters" in value,
  );
}

function parseJsonBody(text: string) {
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text;
  }
}

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function formatMetric(value: number | string | null) {
  return value === null ? "-" : String(value);
}
