"use client";

import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import type { ReplayReport } from "@/modules/decision-observatory";

type ReplayHttpResult = {
  body: unknown;
  ok: boolean;
  status: number;
  statusText: string;
};

export default function DecisionReplayPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [authStatus, setAuthStatus] = useState("Verificando sessao...");
  const [outputId, setOutputId] = useState(() => readInitialOutputId());
  const [report, setReport] = useState<ReplayReport | null>(null);
  const [lastResult, setLastResult] = useState<ReplayHttpResult | null>(null);
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
    if (accessToken && outputId.trim()) {
      void runReplay();
    }
    // Initial load is driven by session + URL param. Manual changes are explicit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  async function runReplay() {
    if (!accessToken || !outputId.trim()) {
      return;
    }

    setIsLoading(true);
    setLastResult(null);

    const result = await requestReplay(outputId.trim());

    setLastResult(result);

    if (result.ok && isReplayReport(result.body)) {
      setReport(result.body);
    } else {
      setReport(null);
    }

    setIsLoading(false);
  }

  async function requestReplay(nextOutputId: string): Promise<ReplayHttpResult> {
    if (!accessToken) {
      return {
        body: { error: "Sessao indisponivel ou expirada." },
        ok: false,
        status: 401,
        statusText: "Unauthorized",
      };
    }

    const response = await fetch("/api/decision-observatory/replay", {
      body: JSON.stringify({ outputId: nextOutputId }),
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    });
    const text = await response.text();

    return {
      body: parseJsonBody(text),
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
    };
  }

  return (
    <main className="min-h-screen bg-background p-5 text-foreground sm:p-8">
      <section className="mx-auto grid max-w-6xl gap-6">
        <header className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            EVOLV interno
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-normal">
            Decision Replay
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Validacao controlada de reprodutibilidade para um Decision Output
            persistido. O replay nao persiste output oficial e nao dispara hooks.
          </p>
        </header>

        <section className="executive-surface grid gap-4 rounded-md p-5">
          <p className="rounded-md border bg-card px-3 py-2 text-sm text-muted-foreground">
            {authStatus}
          </p>

          <label className="grid gap-2 text-sm font-medium">
            Decision Output ID
            <input
              className="rounded-md border bg-background px-3 py-2 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/15"
              onChange={(event) => setOutputId(event.target.value)}
              placeholder="UUID do decision_model_outputs.id"
              value={outputId}
            />
          </label>

          <div className="flex flex-wrap gap-2">
            <Button
              disabled={!accessToken || !outputId.trim() || isLoading}
              onClick={() => void runReplay()}
              type="button"
            >
              {isLoading ? "Executando replay..." : "Executar replay"}
            </Button>
            <Button
              onClick={() => {
                setOutputId("");
                setReport(null);
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
            Nao foi possivel executar o replay. Status {lastResult.status}.
          </p>
        ) : null}

        {report ? <ReplayReportDetails report={report} /> : null}
      </section>
    </main>
  );
}

function ReplayReportDetails({ report }: { report: ReplayReport }) {
  return (
    <section className="grid gap-5">
      <div className="grid gap-4 rounded-md border bg-card p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Replay Status
            </p>
            <h2 className="mt-1 text-xl font-semibold">{report.status}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {report.executiveSummary}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="secondary">
              <Link
                href={`/internal/decision-inspector?outputId=${report.originalOutput.id}`}
              >
                Inspector
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <ReplayMetric label="Modelo" value={report.session.modelId} />
          <ReplayMetric
            label="Versao"
            value={report.session.modelVersion ?? "-"}
          />
          <ReplayMetric
            label="Started"
            value={formatDateTime(report.session.startedAt)}
          />
          <ReplayMetric
            label="Completed"
            value={formatDateTime(report.session.completedAt)}
          />
        </div>
      </div>

      <ReplayJsonPanel title="Replay Comparison" value={report.comparison} />
      <ReplayJsonPanel
        title="Replay Execution metadata"
        value={report.session}
      />
      <ReplayJsonPanel title="Replay Errors" value={report.errors} />
      <ReplayJsonPanel
        defaultOpen={false}
        title="Replay Output efemero"
        value={report.replayOutput}
      />
    </section>
  );
}

function ReplayMetric({ label, value }: { label: string; value: string }) {
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

function ReplayJsonPanel({
  defaultOpen = true,
  title,
  value,
}: {
  defaultOpen?: boolean;
  title: string;
  value: unknown;
}) {
  return (
    <details className="rounded-md border bg-card p-4 text-sm" open={defaultOpen}>
      <summary className="cursor-pointer text-sm font-semibold text-foreground">
        {title}
      </summary>
      <pre className="mt-3 max-h-[420px] overflow-auto rounded-md bg-background p-3 text-xs leading-5 text-muted-foreground">
        {JSON.stringify(value, null, 2)}
      </pre>
    </details>
  );
}

function readInitialOutputId() {
  if (typeof window === "undefined") {
    return "";
  }

  return new URLSearchParams(window.location.search).get("outputId")?.trim() ?? "";
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

function isReplayReport(value: unknown): value is ReplayReport {
  return Boolean(
    value &&
      typeof value === "object" &&
      "status" in value &&
      "session" in value &&
      "executiveSummary" in value,
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
