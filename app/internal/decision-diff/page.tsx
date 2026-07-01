"use client";

import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import type { DecisionDiffResponsePayload } from "@/modules/decision-observatory";

type DiffHttpResult = {
  body: unknown;
  ok: boolean;
  status: number;
  statusText: string;
};

export default function DecisionDiffPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [authStatus, setAuthStatus] = useState("Verificando sessao...");
  const [previousOutputId, setPreviousOutputId] = useState(() =>
    readInitialQueryParam("previousOutputId"),
  );
  const [currentOutputId, setCurrentOutputId] = useState(() =>
    readInitialQueryParam("currentOutputId"),
  );
  const [diff, setDiff] = useState<DecisionDiffResponsePayload | null>(null);
  const [lastResult, setLastResult] = useState<DiffHttpResult | null>(null);
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
    if (accessToken && previousOutputId.trim() && currentOutputId.trim()) {
      void loadDiff();
    }
    // Initial load is driven by session + URL params. Manual changes are explicit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  async function loadDiff() {
    if (!accessToken || !previousOutputId.trim() || !currentOutputId.trim()) {
      return;
    }

    setIsLoading(true);
    setLastResult(null);

    const params = new URLSearchParams({
      currentOutputId: currentOutputId.trim(),
      previousOutputId: previousOutputId.trim(),
    });
    const result = await requestJson(
      `/api/decision-observatory/diff?${params.toString()}`,
    );

    setLastResult(result);

    if (result.ok && isDiffResponse(result.body)) {
      setDiff(result.body);
    } else {
      setDiff(null);
    }

    setIsLoading(false);
  }

  async function requestJson(path: string): Promise<DiffHttpResult> {
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

  return (
    <main className="min-h-screen bg-background p-5 text-foreground sm:p-8">
      <section className="mx-auto grid max-w-6xl gap-6">
        <header className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            EVOLV interno
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-normal">
            Decision Diff
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Comparacao read-only entre dois Decision Outputs persistidos. Esta
            tela usa o Decision Comparison Engine e nao executa Decision Models.
          </p>
        </header>

        <section className="executive-surface grid gap-4 rounded-md p-5">
          <p className="rounded-md border bg-card px-3 py-2 text-sm text-muted-foreground">
            {authStatus}
          </p>

          <div className="grid gap-3 md:grid-cols-2">
            <DiffInput
              label="Previous Output ID"
              onChange={setPreviousOutputId}
              value={previousOutputId}
            />
            <DiffInput
              label="Current Output ID"
              onChange={setCurrentOutputId}
              value={currentOutputId}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              disabled={
                !accessToken ||
                !previousOutputId.trim() ||
                !currentOutputId.trim() ||
                isLoading
              }
              onClick={() => void loadDiff()}
              type="button"
            >
              {isLoading ? "Comparando..." : "Comparar outputs"}
            </Button>
            <Button
              onClick={() => {
                setPreviousOutputId("");
                setCurrentOutputId("");
                setDiff(null);
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
            Nao foi possivel comparar os Decision Outputs. Status{" "}
            {lastResult.status}.
          </p>
        ) : null}

        {diff ? <DecisionDiffDetails diff={diff} /> : null}
      </section>
    </main>
  );
}

function DecisionDiffDetails({
  diff,
}: {
  diff: DecisionDiffResponsePayload;
}) {
  const { comparison } = diff;

  return (
    <section className="grid gap-5">
      <div className="grid gap-4 rounded-md border bg-card p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Resumo
            </p>
            <h2 className="mt-1 text-xl font-semibold">
              {comparison.summary.hasChanges
                ? "Mudancas detectadas"
                : "Sem mudancas estruturais detectadas"}
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="secondary">
              <Link
                href={`/internal/decision-inspector?outputId=${comparison.previousOutputId}`}
              >
                Inspecionar anterior
              </Link>
            </Button>
            <Button asChild size="sm" variant="secondary">
              <Link
                href={`/internal/decision-inspector?outputId=${comparison.currentOutputId}`}
              >
                Inspecionar atual
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-5">
          <DiffMetric
            label="Decision"
            value={comparison.summary.decisionChanged ? "Alterada" : "Igual"}
          />
          <DiffMetric
            label="Score delta"
            value={
              comparison.summary.scoreDelta === null
                ? "-"
                : String(comparison.summary.scoreDelta)
            }
          />
          <DiffMetric
            label="Confidence"
            value={comparison.summary.confidenceChanged ? "Alterada" : "Igual"}
          />
          <DiffMetric
            label="Evidence"
            value={`+${comparison.evidence.added.length} / -${comparison.evidence.removed.length}`}
          />
          <DiffMetric
            label="Contributors"
            value={`+${comparison.contributors.added.length} / -${comparison.contributors.removed.length}`}
          />
        </div>
      </div>

      <DiffSection title="Core" value={comparison.core} />
      <DiffSection title="Rationale" value={comparison.rationale} />
      <DiffSection title="Evidence" value={comparison.evidence} />
      <DiffSection title="Contributors" value={comparison.contributors} />
      <DiffSection title="Metadata" value={comparison.metadata} />
      <DiffSection
        defaultOpen={false}
        title="Outputs comparados"
        value={{
          currentOutput: diff.currentOutput,
          previousOutput: diff.previousOutput,
        }}
      />
    </section>
  );
}

function DiffInput({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      {label}
      <input
        className="rounded-md border bg-background px-3 py-2 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/15"
        onChange={(event) => onChange(event.target.value)}
        placeholder="UUID do decision_model_outputs.id"
        value={value}
      />
    </label>
  );
}

function DiffMetric({ label, value }: { label: string; value: string }) {
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

function DiffSection({
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

function readInitialQueryParam(key: string) {
  if (typeof window === "undefined") {
    return "";
  }

  return new URLSearchParams(window.location.search).get(key)?.trim() ?? "";
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

function isDiffResponse(value: unknown): value is DecisionDiffResponsePayload {
  return Boolean(
    value &&
      typeof value === "object" &&
      "comparison" in value &&
      "previousOutput" in value &&
      "currentOutput" in value,
  );
}

function parseJsonBody(text: string) {
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text;
  }
}
